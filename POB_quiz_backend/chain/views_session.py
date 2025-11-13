from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from random import SystemRandom, Random
from web3 import Web3
from django.conf import settings
import time
from .web3svc_tournament import get_w3_and_tournament, send_tx_from_house

from .models import (
    Question, Option, QuizSession, QuizSessionQuestion, UserAnswer, SettlementJob
)
from .locks import user_lock
from .web3svc import get_w3_and_contract
from .scoring import score_session

# NEW: tournament helpers
from .web3svc_tournament import get_w3_and_tournament, send_tx_from_house

rng_secure = SystemRandom()


def jwt_addr(request):
    return (
        (request.headers.get('X-Addr')
         or getattr(request, 'data', {}).get('address')
         or request.query_params.get('address')
         or '')
        .lower()
    )


@api_view(['POST'])
def session_start(request):
    addr = jwt_addr(request)
    if not addr:
        return Response({'error': 'auth required'}, status=401)
    N = int(request.data.get('count') or 10)
    N = max(1, min(50, N))

    user_lock(addr)
    with transaction.atomic():
        _, c = get_w3_and_contract()
        credits_onchain = c.functions.credits(Web3.to_checksum_address(addr)).call()
        pending = QuizSession.objects.filter(
            user_address=addr, state__in=['ACTIVE', 'SUBMITTED']
        ).count()
        if credits_onchain - pending <= 0:
            return Response({'error': 'No available credit'}, status=409)

        ids = list(Question.objects.filter(is_active=True).values_list('id', flat=True))
        if not ids:
            return Response({'error': 'No questions available'}, status=503)
        if len(ids) < N:
            N = len(ids)

        seed = rng_secure.getrandbits(64) & ((1 << 63) - 1)
        sess = QuizSession.objects.create(
            user_address=addr,
            rng_seed=seed,
            total_questions=N,
            state='ACTIVE',
            time_limit_secs=settings.QUIZ_TIME_LIMIT,
            expires_at=timezone.now() + timezone.timedelta(seconds=settings.QUIZ_TIME_LIMIT),
        )
        rnd = Random(seed)
        picks = rnd.sample(ids, N)
        items = []
        for idx, qid in enumerate(picks, start=1):
            opts = list(Option.objects.filter(question_id=qid).values('id', 'text'))
            rnd.shuffle(opts)
            items.append(QuizSessionQuestion(
                session=sess, question_id=qid, shuffled_options=opts, order=idx
            ))
        QuizSessionQuestion.objects.bulk_create(items)

    qs_map = Question.objects.in_bulk(picks)
    payload_q = []
    for it in QuizSessionQuestion.objects.filter(session=sess).order_by('order'):
        q = qs_map[it.question_id]
        payload_q.append({
            'order': it.order,
            'questionId': it.question_id,
            'text': q.text,
            'difficulty': q.difficulty,
            'category': q.category,
            'options': it.shuffled_options,
        })

    return Response({
        'sessionId': sess.id,
        'timeLimit': settings.QUIZ_TIME_LIMIT,
        'expiresAt': sess.expires_at,
        'questions': payload_q
    })


@api_view(['POST'])
def session_answer(request):
    addr = jwt_addr(request)
    if not addr:
        return Response({'error': 'auth required'}, status=401)
    sid = request.data.get('sessionId')
    answers = request.data.get('answers') or []
    try:
        with transaction.atomic():
            sess = QuizSession.objects.select_for_update().get(id=sid, user_address=addr)
            if sess.state not in ('ACTIVE', 'SUBMITTED'):
                return Response({'error': 'invalid state'}, status=400)
            if timezone.now() >= sess.expires_at:
                return Response({'error': 'expired'}, status=410)

            allowed = {
                it.question_id: {o['id'] for o in it.shuffled_options}
                for it in QuizSessionQuestion.objects.filter(session=sess)
            }
            for a in answers:
                qid = int(a['questionId']); oid = int(a['optionId'])
                if oid not in allowed.get(qid, set()):
                    return Response(
                        {'error': f'option {oid} not in session for question {qid}'},
                        status=422
                    )
                UserAnswer.objects.update_or_create(
                    session=sess, question_id=qid, defaults={'option_id': oid}
                )
            sess.state = 'SUBMITTED'
            sess.save(update_fields=['state'])
    except QuizSession.DoesNotExist:
        return Response({'error': 'not found'}, status=404)

    return Response({'ok': True})


@api_view(['POST'])
def session_finish(request):
    addr = jwt_addr(request)
    if not addr:
        return Response({'error': 'auth required'}, status=401)

    sid = request.data.get('sessionId')
    try:
        sess = QuizSession.objects.get(id=sid, user_address=addr)
    except QuizSession.DoesNotExist:
        return Response({'error': 'not found'}, status=404)

    # If already scored, return existing result (idempotent)
    if sess.state == 'SCORED':
        return Response({
            'correct': sess.correct_count,
            'total': sess.total_questions,
            'passed': sess.passed,
            'passThreshold': sess.total_questions,
            'expiresAt': sess.expires_at,
            'payout_amount_smallest': getattr(sess, 'payout_amount_smallest', 0),
            'tournament': {'attempted': False, 'recorded': False, 'reason': 'already scored'}
        }, status=200)

    # Score the session (your existing scoring routine)
    sess = score_session(sess)

    # --- Payout logic: idempotent write of payout_amount_smallest ---
    # micro-cUSD (6 decimals)
    from decimal import Decimal, getcontext, ROUND_DOWN
    getcontext().prec = 36
    TOKEN_DECIMALS = 6
    PAYOUT_MULTIPLIER = Decimal("1.8")

    # Read entry fee (micro units) from settings if present, else fallback to 1 cUSD (1_000_000)
    ENTRY_FEE_MICRO = getattr(settings, "QUIZ_ENTRY_FEE_MICRO", None)
    if ENTRY_FEE_MICRO is None:
        fq = getattr(settings, "QUIZ_ENTRY_FEE", None)
        if fq is not None:
            ENTRY_FEE_MICRO = int(Decimal(str(fq)) * (10 ** TOKEN_DECIMALS))
        else:
            ENTRY_FEE_MICRO = int(getattr(settings, "DEFAULT_ENTRY_FEE_MICRO", 1_000_000))

    # Write payout_amount_smallest only if passed and payout is not already set
    try:
        current_payout = getattr(sess, 'payout_amount_smallest', 0) or 0
        if sess.passed and current_payout == 0:
            payout_micro = int((Decimal(ENTRY_FEE_MICRO) * PAYOUT_MULTIPLIER).quantize(Decimal('1'), rounding=ROUND_DOWN))
            sess.payout_amount_smallest = payout_micro
    except Exception as e:
        # Log (print) to avoid failing the request; scoring still persisted below
        print("payout calc failed:", e)

    # Persist persisted values are already set by score_session, but ensure fields saved
    sess.state = 'SCORED'
    sess.finished_at = sess.finished_at or timezone.now()  # in case score_session didn't set it
    sess.save(update_fields=['correct_count', 'passed', 'finished_at', 'state', 'payout_amount_smallest'])

    # Enqueue settlement job if configured (keep your original behavior)
    if getattr(settings, 'SETTLE_AUTOMATICALLY', False):
        SettlementJob.objects.get_or_create(
            session=sess,
            defaults={'user_address': sess.user_address, 'won': bool(sess.passed)}
        )

    # Tournament recording logic unchanged — keep your original code block
    tour_result = {'attempted': False, 'recorded': False}
    if getattr(settings, 'TOURNAMENT_AUTO_RECORD', True):
        try:
            _, tc = get_w3_and_tournament()
            tid = int(tc.functions.tournamentCounter().call() or 0)
            if tid > 0:
                info = tc.functions.getTournamentInfo(tid).call()
                _, reg_end, start_ts, end_ts, *_rest = info
                now = int(time.time())
                if now >= int(start_ts) and now <= int(end_ts):
                    tour_result['attempted'] = True
                    player = Web3.to_checksum_address(addr)
                    (registered, totalPoints) = tc.functions.getPlayerInfo(tid, player).call()
                    passes = int(tc.functions.getPlayerPasses(tid, player).call())
                    if not registered:
                        tour_result['reason'] = 'not registered'
                    elif passes <= 0:
                        tour_result['reason'] = 'no passes remaining'
                    else:
                        points = int(sess.correct_count)
                        fn = tc.functions.recordScore(tid, player, points)
                        tx_hash = send_tx_from_house(fn)
                        tour_result['recorded'] = True
                        tour_result['txHash'] = tx_hash
                else:
                    tour_result['attempted'] = True
                    tour_result['reason'] = 'not in play window'
            else:
                tour_result['attempted'] = True
                tour_result['reason'] = 'no tournament'
        except Exception as e:
            tour_result['attempted'] = True
            tour_result['recorded'] = False
            tour_result['error'] = str(e)

    return Response({
        'correct': sess.correct_count,
        'total': sess.total_questions,
        'passed': sess.passed,
        'passThreshold': sess.total_questions,
        'expiresAt': sess.expires_at,
        'payout_amount_smallest': getattr(sess, 'payout_amount_smallest', 0),
        'tournament': tour_result
    })



@api_view(['GET'])
def session_status(request, sid: int):
    addr = jwt_addr(request)
    if not addr:
        return Response({'error': 'auth required'}, status=401)
    try:
        sess = QuizSession.objects.get(id=sid, user_address=addr)
    except QuizSession.DoesNotExist:
        return Response({'error': 'not found'}, status=404)
    remaining = max(0, int((sess.expires_at - timezone.now()).total_seconds() * 1000))
    return Response({'state': sess.state, 'remainingMs': remaining, 'expiresAt': sess.expires_at})


# === NEW: Payout status API ===
@api_view(['GET'])
def settlement_status(request):
    session_id = request.query_params.get('session')
    addr = jwt_addr(request)
    if not session_id or not addr:
        return Response({'error': 'invalid'}, status=400)
    job = SettlementJob.objects.filter(session_id=session_id, user_address=addr).first()
    if not job:
        return Response({'tx_hash': None})
    return Response({
        'tx_hash': job.tx_hash,
        'status': job.status
    })


@api_view(['POST'])
def tournament_session_start(request):
    addr = jwt_addr(request)
    if not addr:
        return Response({'error': 'auth required'}, status=401)
    
    tournament_id = int(request.data.get('tournamentId', 0))
    if tournament_id <= 0:
        return Response({'error': 'tournamentId required'}, status=400)
    
    _, tc = get_w3_and_tournament()
    
    try:
        info = tc.functions.getTournamentInfo(tournament_id).call()
        entry_fee, reg_end, start_ts, end_ts, questions_per_session, time_per_question, settled, total_pool, player_count = info
    except Exception as e:
        return Response({'error': f'Tournament not found: {e}'}, status=404)
    
    now = int(time.time())
    if now < int(start_ts):
        return Response({'error': 'Tournament not started yet'}, status=409)
    if now > int(end_ts):
        return Response({'error': 'Tournament has ended'}, status=409)
    if settled:
        return Response({'error': 'Tournament already settled'}, status=409)
    
    try:
        player = Web3.to_checksum_address(addr)
        registered, total_points = tc.functions.getPlayerInfo(tournament_id, player).call()
        passes = int(tc.functions.getPlayerPasses(tournament_id, player).call())
    except Exception as e:
        return Response({'error': f'Failed to check player: {e}'}, status=400)
    
    if not registered:
        return Response({'error': 'You are not registered for this tournament'}, status=403)
    if passes <= 0:
        return Response({'error': 'No passes remaining. Buy more passes first.'}, status=403)
    
    N = int(questions_per_session)
    time_limit_secs = int(time_per_question) * N
    
    user_lock(addr)
    with transaction.atomic():
        ids = list(Question.objects.filter(is_active=True).values_list('id', flat=True))
        if not ids:
            return Response({'error': 'No questions available'}, status=503)
        if len(ids) < N:
            N = len(ids)
        
        seed = rng_secure.getrandbits(64) & ((1 << 63) - 1)
        sess = QuizSession.objects.create(
            user_address=addr,
            rng_seed=seed,
            total_questions=N,
            state='ACTIVE',
            time_limit_secs=time_limit_secs,
            expires_at=timezone.now() + timezone.timedelta(seconds=time_limit_secs),
        )
        
        rnd = Random(seed)
        picks = rnd.sample(ids, N)
        items = []
        for idx, qid in enumerate(picks, start=1):
            opts = list(Option.objects.filter(question_id=qid).values('id', 'text'))
            rnd.shuffle(opts)
            items.append(QuizSessionQuestion(
                session=sess, question_id=qid, shuffled_options=opts, order=idx
            ))
        QuizSessionQuestion.objects.bulk_create(items)
    
    qs_map = Question.objects.in_bulk(picks)
    payload_q = []
    for it in QuizSessionQuestion.objects.filter(session=sess).order_by('order'):
        q = qs_map[it.question_id]
        payload_q.append({
            'order': it.order,
            'questionId': it.question_id,
            'text': q.text,
            'difficulty': q.difficulty,
            'category': q.category,
            'options': it.shuffled_options,
        })
    
    return Response({
        'sessionId': sess.id,
        'tournamentId': tournament_id,
        'timeLimit': time_limit_secs,
        'expiresAt': sess.expires_at,
        'questions': payload_q,
        'passesRemaining': passes
    })


@api_view(['POST'])
def tournament_session_finish(request):
    addr = jwt_addr(request)
    if not addr:
        return Response({'error': 'auth required'}, status=401)
    
    session_id = request.data.get('sessionId')
    tournament_id = int(request.data.get('tournamentId', 0))
    
    if not session_id:
        return Response({'error': 'sessionId required'}, status=400)
    if tournament_id <= 0:
        return Response({'error': 'tournamentId required'}, status=400)
    
    try:
        sess = QuizSession.objects.get(id=session_id, user_address=addr)
    except QuizSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)
    
    if sess.state == 'SCORED':
        return Response({
            'correct': sess.correct_count,
            'total': sess.total_questions,
            'points': sess.correct_count,
            'recorded': False,
            'reason': 'Session already scored'
        })
    
    sess = score_session(sess)
    points = int(sess.correct_count)
    
    _, tc = get_w3_and_tournament()
    try:
        player = Web3.to_checksum_address(addr)
        fn = tc.functions.recordScore(tournament_id, player, points)
        tx_hash = send_tx_from_house(fn)
        passes_remaining = int(tc.functions.getPlayerPasses(tournament_id, player).call())
        
        return Response({
            'correct': sess.correct_count,
            'total': sess.total_questions,
            'points': points,
            'recorded': True,
            'txHash': tx_hash,
            'tournamentId': tournament_id,
            'passesRemaining': passes_remaining
        })
        
    except Exception as e:
        return Response({
            'correct': sess.correct_count,
            'total': sess.total_questions,
            'points': points,
            'recorded': False,
            'error': str(e)
        }, status=500)