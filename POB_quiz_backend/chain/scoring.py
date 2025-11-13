
from django.utils import timezone
from .models import Option, QuizSession, QuizSessionQuestion, UserAnswer

def score_session(sess: QuizSession):
    if sess.state == 'SCORED':
        return sess
    items = list(QuizSessionQuestion.objects.filter(session=sess).select_related('question'))
    answers = {ua.question_id: ua.option_id for ua in UserAnswer.objects.filter(session=sess)}
    qids = [i.question_id for i in items]
    correct_map = {o.question_id: o.id for o in Option.objects.filter(question_id__in=qids, is_correct=True)}
    correct = 0
    for it in items:
        if answers.get(it.question_id) == correct_map.get(it.question_id):
            correct += 1
    sess.correct_count = correct
    sess.passed = (correct == sess.total_questions)
    sess.state = 'SCORED'
    sess.finished_at = timezone.now()
    sess.save(update_fields=['correct_count','passed','state','finished_at'])
    return sess
