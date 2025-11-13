from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.conf import settings

from chain.models import QuizSession, SettlementJob
from chain.scoring import score_session

class Command(BaseCommand):
    help = 'Autosubmit expired quiz sessions'

    def handle(self, *args, **opts):
        now = timezone.now()
        batch = list(QuizSession.objects.filter(
            state__in=['ACTIVE', 'SUBMITTED'],
            expires_at__lte=now
        ).order_by('expires_at')[:200])

        count = 0
        for s in batch:
            with transaction.atomic():
                s = QuizSession.objects.select_for_update().get(id=s.id)
                if s.state in ('ACTIVE', 'SUBMITTED') and s.expires_at <= now:
                    s = score_session(s)
                    if settings.SETTLE_AUTOMATICALLY:
                        SettlementJob.objects.get_or_create(
                            session=s,
                            defaults={'user_address': s.user_address, 'won': bool(s.passed)}
                        )
                    count += 1
        self.stdout.write(self.style.SUCCESS(f'Autosubmitted {count} sessions'))
