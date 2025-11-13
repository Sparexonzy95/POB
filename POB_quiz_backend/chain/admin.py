from django.contrib import admin
from .models import (
    UserWallet, Nonce, BlockCursor, ContractEvent,
    Question, Option, QuizSession, QuizSessionQuestion,
    UserAnswer, SettlementJob, TournamentPlayTracker
)

admin.site.register(UserWallet)
admin.site.register(Nonce)
admin.site.register(BlockCursor)
admin.site.register(ContractEvent)
admin.site.register(Question)
admin.site.register(Option)
admin.site.register(QuizSession)
admin.site.register(QuizSessionQuestion)
admin.site.register(UserAnswer)
admin.site.register(SettlementJob)
admin.site.register(TournamentPlayTracker)
