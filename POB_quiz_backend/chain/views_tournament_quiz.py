# api/views_tournament_quiz.py
"""
Tournament Quiz Session Logic
Reuses existing single-player question/session infrastructure
but validates tournament passes and records scores to tournament contract.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from random import Random
from web3 import Web3
import time

from .models import (
    Question, Option, QuizSession, QuizSessionQuestion, UserAnswer,
    TournamentPlayTracker  # Import the tournament tracker model
)
from .locks import user_lock
from .web3svc_tournament import get_w3_and_tournament, send_tx_from_house
from .scoring import score_session


def jwt_addr(request):
    """Extract address from request headers/body/params"""
    return (
        (request.headers.get('X-Addr')
         or getattr(request, 'data', {}).get('address')
         or request.query_params.get('address')
         or '')
        .lower()
    )


def _ck(addr: str) -> str:
    """Convert to checksum address"""
    return Web3.to_checksum_address(addr)


def check_daily_tournament_limit(address, tournament_id, max_daily_plays=2):
    """
    Check if a player has reached their daily tournament play limit.
    Fix: Ensure accurate counting and consistent time zone handling.
    """
    # Use consistent timezone handling - use UTC for both query and comparison
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Count tournament plays today for this user - make sure the query is correct
    plays_today = TournamentPlayTracker.objects.filter(
        user_address=address.lower(),  # Ensure case consistency
        tournament_id=int(tournament_id),  # Ensure int type
        played_at__gte=today_start
    ).count()
    
    # Log for debugging
    print(f"Daily plays check for {address}, tournament {tournament_id}: {plays_today}/{max_daily_plays}")
    
    return plays_today < max_daily_plays, plays_today, max_daily_plays



@api_view(['POST'])
def tournament_session_start(request):
    """
    Start a tournament quiz session.
    
    Expected params:
    - tournamentId: int - which tournament to play
    - count: int (optional) - number of questions (defaults to tournament's questionsPerSession)
    
    Validates:
    - Tournament exists and is in play window
    - User is registered
    - User has at least 1 pass
    - User has not exceeded daily play limit (max 2 games per day)
    
    Returns:
    - sessionId
    - tournamentId
    - timeLimit (from tournament config)
    - expiresAt
    - questions (shuffled, same format as single-player)
    """
    addr = jwt_addr(request)
    if not addr:
        return Response({'error': 'auth required'}, status=401)
    
    tournament_id = int(request.data.get('tournamentId', 0))
    if tournament_id <= 0:
        return Response({'error': 'tournamentId required'}, status=400)
    
    # Check daily session limit (MAX 2 GAMES PER DAY)
    allowed, plays_today, max_plays = check_daily_tournament_limit(addr, tournament_id)
    if not allowed:
        return Response({
            'error': f'Daily tournament limit reached ({plays_today}/{max_plays})',
            'playsToday': plays_today,
            'maxDailyPlays': max_plays
        }, status=403)
    
    # Get tournament contract
    _, tc = get_w3_and_tournament()
    
    # Validate tournament exists
    try:
        counter = int(tc.functions.tournamentCounter().call() or 0)
        if tournament_id > counter:
            return Response({'error': 'tournament does not exist'}, status=404)
    except Exception as e:
        return Response({'error': f'failed to check tournament: {e}'}, status=400)
    
    # Get tournament info
    try:
        # getTournamentInfo returns:
        # (entryFee, regEnd, start, end, qPer, tPer, settled, totalPool, playerCount)
        info = tc.functions.getTournamentInfo(tournament_id).call()
        entry_fee, reg_end, start_ts, end_ts, questions_per_session, time_per_question, settled, total_pool, player_count = info
    except Exception as e:
        return Response({'error': f'failed to get tournament info: {e}'}, status=400)
    
    # Validate tournament is in play window
    now = int(time.time())
    if now < int(start_ts):
        return Response({'error': 'tournament has not started yet'}, status=409)
    if now > int(end_ts):
        return Response({'error': 'tournament has ended'}, status=409)
    if settled:
        return Response({'error': 'tournament is already settled'}, status=409)
    
    # Check player registration and passes
    try:
        player = _ck(addr)
        registered, total_points = tc.functions.getPlayerInfo(tournament_id, player).call()
        passes = int(tc.functions.getPlayerPasses(tournament_id, player).call())
    except Exception as e:
        return Response({'error': f'failed to get player info: {e}'}, status=400)
    
    if not registered:
        return Response({'error': 'you are not registered for this tournament'}, status=403)
    if passes <= 0:
        return Response({'error': 'no passes remaining'}, status=403)
    
    # Determine question count (use tournament config or request param)
    N = int(request.data.get('count', questions_per_session))
    N = max(1, min(int(questions_per_session), N))
    
    # Calculate time limit (timePerQuestion * N, or from settings)
    time_limit_secs = int(time_per_question) * N
    
    # Lock user and create session (same logic as single-player)
    user_lock(addr)
    with transaction.atomic():
        # Get active questions from DB
        question_ids = list(Question.objects.filter(is_active=True).values_list('id', flat=True))
        if not question_ids:
            return Response({'error': 'no questions available'}, status=503)
        if len(question_ids) < N:
            N = len(question_ids)
        
        # Create tournament session with metadata
        from random import SystemRandom
        rng_secure = SystemRandom()
        seed = rng_secure.getrandbits(64) & ((1 << 63) - 1)
        
        sess = QuizSession.objects.create(
            user_address=addr,
            rng_seed=seed,
            total_questions=N,
            state='ACTIVE',
            time_limit_secs=time_limit_secs,
            expires_at=timezone.now() + timezone.timedelta(seconds=time_limit_secs),
        )
        
        # Create a tournament play tracker record to enforce daily limits
        TournamentPlayTracker.objects.create(
            user_address=addr,
            tournament_id=tournament_id,
            session_id=sess.id
        )
        
        # Select and shuffle questions (same as single-player)
        rnd = Random(seed)
        picks = rnd.sample(question_ids, N)
        
        items = []
        for idx, qid in enumerate(picks, start=1):
            opts = list(Option.objects.filter(question_id=qid).values('id', 'text'))
            rnd.shuffle(opts)
            items.append(QuizSessionQuestion(
                session=sess, question_id=qid, shuffled_options=opts, order=idx
            ))
        QuizSessionQuestion.objects.bulk_create(items)
    
    # Build response payload (same as single-player)
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
        'passesRemaining': passes,  # informational
        'playsToday': plays_today + 1,  # Include the current play
        'maxDailyPlays': max_plays
    })


@api_view(['POST'])
def tournament_session_finish(request):
    """
    Finish a tournament quiz session and record score on-chain.
    
    ✅ CRITICAL FIX: Now handles expired sessions gracefully!
    - Accepts submissions even after time expires
    - Scores all submitted answers
    - Records points on blockchain if tournament is still active
    
    Expected params:
    - sessionId: int
    - tournamentId: int
    
    Returns:
    - correct: number of correct answers
    - total: total questions
    - points: points awarded (same as correct)
    - recorded: boolean - whether score was successfully recorded on-chain
    - txHash: transaction hash (if recorded)
    - passesRemaining: passes left after this session
    """
    addr = jwt_addr(request)
    if not addr:
        return Response({'error': 'auth required'}, status=401)
    
    session_id = request.data.get('sessionId')
    tournament_id = int(request.data.get('tournamentId', 0))
    
    if not session_id:
        return Response({'error': 'sessionId required'}, status=400)
    if tournament_id <= 0:
        return Response({'error': 'tournamentId required'}, status=400)
    
    # Get session
    try:
        sess = QuizSession.objects.get(id=session_id, user_address=addr)
    except QuizSession.DoesNotExist:
        return Response({'error': 'session not found'}, status=404)
    
    # If already scored, return cached result
    if sess.state == 'SCORED':
        # Get tournament contract to check passes
        try:
            _, tc = get_w3_and_tournament()
            player = _ck(addr)
            passes_remaining = int(tc.functions.getPlayerPasses(tournament_id, player).call())
        except:
            passes_remaining = 0
        
        return Response({
            'correct': sess.correct_count,
            'total': sess.total_questions,
            'points': sess.correct_count,
            'recorded': False,
            'reason': 'session already scored and submitted',
            'passesRemaining': passes_remaining
        })
    
    # ✅ CRITICAL FIX: Check if expired but don't reject - just log it
    now = timezone.now()
    is_expired = sess.expires_at < now
    
    if is_expired:
        seconds_late = (now - sess.expires_at).total_seconds()
        print(f"⚠️ Session {session_id} expired {seconds_late:.1f}s ago, but scoring anyway (user may have answered in time)")
    else:
        print(f"✅ Session {session_id} finished with {(sess.expires_at - now).total_seconds():.1f}s remaining")
    
    # Score the session (reuse existing scoring logic)
    # This works regardless of expiration
    try:
        sess = score_session(sess)
        points = int(sess.correct_count)
        print(f"✅ Session {session_id} scored: {points}/{sess.total_questions} correct")
    except Exception as e:
        print(f"❌ Error scoring session {session_id}: {e}")
        return Response({
            'error': f'Failed to score session: {e}'
        }, status=500)
    
    # Get tournament contract
    _, tc = get_w3_and_tournament()
    
    # Validate tournament state (should still be in play window)
    try:
        info = tc.functions.getTournamentInfo(tournament_id).call()
        _, _, start_ts, end_ts, _, _, settled, _, _ = info
        tournament_time = int(time.time())
        
        # Check tournament status
        if tournament_time < int(start_ts):
            print(f"⚠️ Tournament {tournament_id} hasn't started yet")
            return Response({
                'correct': sess.correct_count,
                'total': sess.total_questions,
                'points': points,
                'recorded': False,
                'reason': 'tournament has not started yet'
            })
        
        if tournament_time > int(end_ts):
            print(f"⚠️ Tournament {tournament_id} has ended")
            return Response({
                'correct': sess.correct_count,
                'total': sess.total_questions,
                'points': points,
                'recorded': False,
                'reason': 'tournament has ended'
            })
        
        if settled:
            print(f"⚠️ Tournament {tournament_id} is already settled")
            return Response({
                'correct': sess.correct_count,
                'total': sess.total_questions,
                'points': points,
                'recorded': False,
                'reason': 'tournament is already settled'
            })
            
    except Exception as e:
        print(f"❌ Failed to validate tournament {tournament_id}: {e}")
        return Response({
            'correct': sess.correct_count,
            'total': sess.total_questions,
            'points': points,
            'recorded': False,
            'error': f'failed to validate tournament: {e}'
        })
    
    # ✅ Record score on-chain via house wallet
    try:
        player = _ck(addr)
        
        # Double-check player has passes (the contract will also check)
        passes_before = int(tc.functions.getPlayerPasses(tournament_id, player).call())
        print(f"Player {addr} has {passes_before} passes before recording")
        
        if passes_before <= 0:
            print(f"⚠️ Player {addr} has no passes left")
            return Response({
                'correct': sess.correct_count,
                'total': sess.total_questions,
                'points': points,
                'recorded': False,
                'reason': 'no passes remaining'
            })
        
        # Build recordScore transaction
        fn = tc.functions.recordScore(
            tournament_id,
            player,
            points
        )
        
        # Send transaction from house wallet
        print(f"📤 Recording {points} points for {addr} in tournament {tournament_id}...")
        tx_hash = send_tx_from_house(fn)
        print(f"✅ Score recorded on-chain! Tx: {tx_hash}")
        
        # Get updated passes count
        passes_remaining = int(tc.functions.getPlayerPasses(tournament_id, player).call())
        print(f"Player now has {passes_remaining} passes remaining")
        
        # Mark session as recorded
        sess.recorded_on_chain = True
        if hasattr(sess, 'tx_hash'):
            sess.tx_hash = tx_hash
        sess.save()
        
        return Response({
            'correct': sess.correct_count,
            'total': sess.total_questions,
            'points': points,
            'recorded': True,
            'txHash': tx_hash,
            'tournamentId': tournament_id,
            'passesRemaining': passes_remaining,
            'wasExpired': is_expired,  # Info for frontend
            'note': 'Score successfully recorded on blockchain!' if not is_expired else 'Score recorded despite session expiring'
        })
        
    except Exception as e:
        # Score is saved off-chain but on-chain recording failed
        error_msg = str(e)
        print(f"❌ Failed to record score on-chain for session {session_id}: {error_msg}")
        
        # Try to get passes count for response
        try:
            passes_remaining = int(tc.functions.getPlayerPasses(tournament_id, player).call())
        except:
            passes_remaining = 0
        
        # Determine a helpful reason for the failure
        reason = 'failed to record score on-chain'
        if 'no passes' in error_msg.lower():
            reason = 'no passes remaining'
        elif 'not registered' in error_msg.lower():
            reason = 'not registered for tournament'
        elif 'tournament ended' in error_msg.lower():
            reason = 'tournament has ended'
        
        return Response({
            'correct': sess.correct_count,
            'total': sess.total_questions,
            'points': points,
            'recorded': False,
            'error': error_msg,
            'reason': reason,
            'passesRemaining': passes_remaining,
            'wasExpired': is_expired
        }, status=200)  # ✅ Changed from 500 to 200 - still show results even if recording failed

@api_view(['GET'])
def tournament_session_status(request, session_id: int):
    """
    Get tournament session status (reuses single-player logic).
    Can be used for both single-player and tournament sessions.
    """
    addr = jwt_addr(request)
    if not addr:
        return Response({'error': 'auth required'}, status=401)
    
    try:
        sess = QuizSession.objects.get(id=session_id, user_address=addr)
    except QuizSession.DoesNotExist:
        return Response({'error': 'session not found'}, status=404)
    
    remaining_ms = max(0, int((sess.expires_at - timezone.now()).total_seconds() * 1000))
    
    return Response({
        'sessionId': sess.id,
        'state': sess.state,
        'remainingMs': remaining_ms,
        'expiresAt': sess.expires_at,
        'totalQuestions': sess.total_questions,
        'correctCount': sess.correct_count if sess.state == 'SCORED' else None
    })


@api_view(['GET'])
def tournament_daily_plays(request, tournament_id: int):
    """
    Get information about a user's daily tournament plays.
    Fix: Ensure consistent counting logic.
    """
    addr = jwt_addr(request)
    if not addr:
        return Response({'error': 'auth required'}, status=401)
    
    max_daily_plays = 2  # Constant daily limit
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Use the exact same query as in check_daily_tournament_limit
    plays_today = TournamentPlayTracker.objects.filter(
        user_address=addr.lower(),
        tournament_id=int(tournament_id),
        played_at__gte=today_start
    ).count()
    
    # Get most recent plays with timestamps for debugging
    recent_plays = TournamentPlayTracker.objects.filter(
        user_address=addr.lower(),
        tournament_id=int(tournament_id)
    ).order_by('-played_at')[:5]
    
    recent_plays_data = [
        {
            'session_id': play.session_id,
            'played_at': play.played_at.isoformat(),  # Include timezone info
            'is_today': play.played_at >= today_start
        } for play in recent_plays
    ]
    
    # Include more detailed debugging information
    return Response({
        'tournament_id': tournament_id,
        'plays_today': plays_today,
        'max_daily_plays': max_daily_plays,
        'limit_reached': plays_today >= max_daily_plays,
        'recent_plays': recent_plays_data,
        'today_start': today_start.isoformat(),  # Include for debugging
        'now': timezone.now().isoformat(),       # Include for debugging
    })