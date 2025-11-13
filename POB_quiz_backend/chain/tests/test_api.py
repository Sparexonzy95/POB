
import json
from django.utils import timezone
from freezegun import freeze_time
from chain.models import Question, Option, QuizSession, ContractEvent, BlockCursor

def seed_questions(n=10):
    qids = []
    for i in range(n):
        q = Question.objects.create(text=f'Q{i+1}', category='gen', difficulty='e')
        Option.objects.create(question=q, text='A', is_correct=True)
        Option.objects.create(question=q, text='B', is_correct=False)
        Option.objects.create(question=q, text='C', is_correct=False)
        Option.objects.create(question=q, text='D', is_correct=False)
        qids.append(q.id)
    return qids

def test_quiz_state(client):
    r = client.get('/api/quiz/state')
    assert r.status_code == 200
    body = r.json()
    assert 'entryFee' in body and 'totalFunds' in body

def test_start_session_requires_credit(client_with_addr, db):
    seed_questions()
    # first start OK
    r1 = client_with_addr.post('/api/quiz/session/start', data=json.dumps({}), content_type='application/json')
    assert r1.status_code == 200
    # second start should 409 because pending=1 and credits mocked =1
    r2 = client_with_addr.post('/api/quiz/session/start', data=json.dumps({}), content_type='application/json')
    assert r2.status_code == 409

def test_answer_then_finish_passes_all_correct(client_with_addr, db):
    ids = seed_questions(5)
    r = client_with_addr.post('/api/quiz/session/start', data=json.dumps({'count':5}), content_type='application/json')
    sid = r.json()['sessionId']
    # fetch session items
    from chain.models import QuizSessionQuestion
    items = list(QuizSessionQuestion.objects.filter(session_id=sid).order_by('order'))
    # map correct options
    correct = {}
    from chain.models import Option
    for it in items:
        correct_opt = Option.objects.filter(question_id=it.question_id, is_correct=True).first()
        # find that option id in shuffled options
        assert any(o['id']==correct_opt.id for o in it.shuffled_options)
        correct[it.question_id] = correct_opt.id
    answers = [{'questionId': qid, 'optionId': oid} for qid, oid in correct.items()]
    a = client_with_addr.post('/api/quiz/session/answer', data=json.dumps({'sessionId':sid, 'answers':answers}), content_type='application/json')
    assert a.status_code == 200
    f = client_with_addr.post('/api/quiz/session/finish', data=json.dumps({'sessionId':sid}), content_type='application/json')
    body = f.json()
    assert f.status_code == 200
    assert body['passed'] is True
    assert body['correct'] == 5
    assert body['total'] == 5
    assert body['passThreshold'] == 5

def test_answer_after_expiry_410(client_with_addr, db):
    seed_questions(3)
    with freeze_time('2025-01-01 00:00:00'):
        r = client_with_addr.post('/api/quiz/session/start', data=json.dumps({'count':3}), content_type='application/json')
        sid = r.json()['sessionId']
    # advance beyond 10s
    with freeze_time('2025-01-01 00:00:11'):
        a = client_with_addr.post('/api/quiz/session/answer', data=json.dumps({'sessionId':sid, 'answers':[]}), content_type='application/json')
        assert a.status_code == 410

def test_finish_idempotent_second_call_400(client_with_addr, db):
    seed_questions(2)
    r = client_with_addr.post('/api/quiz/session/start', data=json.dumps({'count':2}), content_type='application/json')
    sid = r.json()['sessionId']
    # no answers -> fail but score once
    f1 = client_with_addr.post('/api/quiz/session/finish', data=json.dumps({'sessionId':sid}), content_type='application/json')
    assert f1.status_code == 200
    f2 = client_with_addr.post('/api/quiz/session/finish', data=json.dumps({'sessionId':sid}), content_type='application/json')
    assert f2.status_code == 400

def test_indexer_idempotent(db, client, monkeypatch):
    # prepare fake logs (two entries)
    class L(dict): pass
    logs = [{
        'transactionHash': bytes.fromhex('aa'*32),
        'logIndex': 0,
        'blockNumber': 100,
        'args': {'user':'0x1','amount':1,'newCredits':1}
    },{
        'transactionHash': bytes.fromhex('bb'*32),
        'logIndex': 1,
        'blockNumber': 101,
        'args': {'user':'0x2','won':True,'payout':10,'houseFee':1}
    }]
    from chain.tests.conftest import MockContract, MockW3
    from chain import web3svc
    def fake_get():
        return (MockW3(), MockContract(logs=logs))
    monkeypatch.setattr(web3svc, 'get_w3_and_contract', fake_get)

    # first run
    from django.core.management import call_command
    call_command('index_quiz')
    assert ContractEvent.objects.count() == 2
    c = BlockCursor.objects.get(key='quiz')
    first_block = c.block_number

    # second run unchanged
    call_command('index_quiz')
    assert ContractEvent.objects.count() == 2
    assert BlockCursor.objects.get(key='quiz').block_number == first_block
