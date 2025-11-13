from django.db import models

class UserWallet(models.Model):
    address = models.CharField(max_length=42, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Nonce(models.Model):
    address = models.CharField(max_length=42, unique=True)
    value = models.CharField(max_length=120)
    issued_at = models.DateTimeField(auto_now_add=True)

class BlockCursor(models.Model):
    key = models.CharField(max_length=64, unique=True)
    block_number = models.PositiveBigIntegerField(default=0)

class ContractEvent(models.Model):
    name = models.CharField(max_length=80)
    tx_hash = models.CharField(max_length=66, db_index=True)
    block_number = models.PositiveBigIntegerField(db_index=True)
    log_index = models.PositiveIntegerField()
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('tx_hash','log_index')

class Question(models.Model):
    text = models.TextField()
    category = models.CharField(max_length=120, blank=True, default='')
    difficulty = models.CharField(max_length=32, blank=True, default='')
    is_active = models.BooleanField(default=True)
    explanation = models.TextField(blank=True, default='')

class Option(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)
    order_hint = models.IntegerField(default=0)

class QuizSession(models.Model):
    user_address = models.CharField(max_length=42, db_index=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    rng_seed = models.BigIntegerField()
    total_questions = models.IntegerField(default=10)
    correct_count = models.IntegerField(default=0)
    passed = models.BooleanField(default=False)
    state = models.CharField(max_length=16, default='ACTIVE') # ACTIVE, SUBMITTED, SCORED
    time_limit_secs = models.IntegerField(default=10)
    expires_at = models.DateTimeField()
    payout_amount_smallest = models.BigIntegerField(default=0)
    tournament_id = models.IntegerField(
        blank=True, 
        null=True,
        help_text='Tournament ID if this is a tournament session'
    )
    
    recorded_on_chain = models.BooleanField(
        default=False,
        help_text='Whether this session score was recorded on blockchain'
    )
    
    tx_hash = models.CharField(
        max_length=66,
        blank=True,
        null=True,
        help_text='Transaction hash for on-chain recording'
    )

    
class QuizSessionQuestion(models.Model):
    session = models.ForeignKey(QuizSession, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    shuffled_options = models.JSONField() # list[{id,text}]
    order = models.IntegerField()

class UserAnswer(models.Model):
    session = models.ForeignKey(QuizSession, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    option = models.ForeignKey(Option, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('session','question')



class SettlementJob(models.Model):
    session = models.OneToOneField(QuizSession, on_delete=models.CASCADE)  # idempotent per session
    user_address = models.CharField(max_length=42, db_index=True)
    won = models.BooleanField()
    status = models.CharField(max_length=24, default='PENDING')  # PENDING, SENDING, CONFIRMED, BLOCKED_FUNDS, FAILED
    tx_hash = models.CharField(max_length=66, blank=True, default='')
    attempts = models.IntegerField(default=0)
    last_error = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


# In models.py
class TournamentPlayTracker(models.Model):
    user_address = models.CharField(max_length=42, db_index=True)
    tournament_id = models.IntegerField()
    session_id = models.IntegerField()  # Reference to QuizSession
    played_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user_address', 'played_at', 'tournament_id']),
        ]