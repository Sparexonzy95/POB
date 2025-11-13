
from django.core.management.base import BaseCommand
from django.db import transaction
from chain.models import BlockCursor, ContractEvent
from chain.web3svc import get_w3_and_contract

class Command(BaseCommand):
    help = 'Index SinglePlayerQuiz events from Celo'

    def handle(self, *args, **opts):
        w3, c = get_w3_and_contract()
        cursor, _ = BlockCursor.objects.get_or_create(key='quiz')
        start = max(cursor.block_number, w3.eth.block_number - 5000)
        end = w3.eth.block_number
        events = ['EntryFeePaid','GameSettled','EntryFeeUpdated','HouseFeePercentUpdated','HouseFunded','OwnershipTransferred']
        for name in events:
            ev = getattr(c.events, name)
            logs = ev().get_logs(fromBlock=start, toBlock=end)
            with transaction.atomic():
                for log in logs:
                    ContractEvent.objects.update_or_create(
                        tx_hash=log['transactionHash'].hex(),
                        log_index=log['logIndex'],
                        defaults={'name': name, 'block_number': log['blockNumber'], 'data': dict(log['args'])}
                    )
        cursor.block_number = end + 1
        cursor.save()
        self.stdout.write(self.style.SUCCESS(f'Indexed up to {end}'))
