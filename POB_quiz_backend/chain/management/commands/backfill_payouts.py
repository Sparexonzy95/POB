# chain/management/commands/backfill_payouts.py
from django.core.management.base import BaseCommand
from decimal import Decimal, getcontext, ROUND_DOWN
from django.conf import settings
from chain.models import QuizSession
from django.db import transaction

getcontext().prec = 36
TOKEN_DECIMALS = 6
PAYOUT_MULTIPLIER = Decimal("1.8")

class Command(BaseCommand):
    help = "Backfill payout_amount_smallest for passed QuizSession rows that lack payout using QUIZ_ENTRY_FEE_MICRO"

    def handle(self, *args, **options):
        # determine entry fee in micro units
        entry_fee_micro = getattr(settings, "QUIZ_ENTRY_FEE_MICRO", None)
        if entry_fee_micro is None:
            fq = getattr(settings, "QUIZ_ENTRY_FEE", None)
            if fq is not None:
                entry_fee_micro = int(Decimal(str(fq)) * (10 ** TOKEN_DECIMALS))
            else:
                self.stderr.write(self.style.ERROR(
                    "QUIZ_ENTRY_FEE_MICRO or QUIZ_ENTRY_FEE must be set in settings/.env"))
                return

        payout_micro = int((Decimal(entry_fee_micro) * PAYOUT_MULTIPLIER).quantize(Decimal('1'), rounding=ROUND_DOWN))
        self.stdout.write(f"Using entry_fee_micro={entry_fee_micro} -> payout_micro={payout_micro}")

        # conservative: only fix rows that are passed=True and payout_amount_smallest in [None, 0, old_fallback]
        # If you previously used fallback 1800000, include that; otherwise you can remove it.
        old_fallback_values = [0, None, 1800000]

        qs = QuizSession.objects.filter(passed=True, finished_at__isnull=False).filter(payout_amount_smallest__in=old_fallback_values)
        total = qs.count()
        self.stdout.write(f"Found {total} sessions to update.")

        if total == 0:
            self.stdout.write(self.style.SUCCESS("Nothing to do."))
            return

        updated = 0
        for s in qs.iterator():
            try:
                with transaction.atomic():
                    s.payout_amount_smallest = payout_micro
                    s.save(update_fields=['payout_amount_smallest'])
                    updated += 1
            except Exception as e:
                self.stderr.write(f"Failed for session {s.id}: {e}")

        self.stdout.write(self.style.SUCCESS(f"Backfilled {updated}/{total} sessions"))
