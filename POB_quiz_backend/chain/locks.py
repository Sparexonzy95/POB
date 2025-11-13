import hashlib
from django.db import connection, transaction
from .models import UserWallet

def user_lock(addr: str):
    """
    Acquire a per-user lock that works on both Postgres and SQLite.
    - On Postgres, use pg_advisory_xact_lock(key).
    - Else (SQLite, etc.), lock a synthetic row via SELECT ... FOR UPDATE.
    """
    addr = (addr or '').lower()
    if connection.vendor == 'postgresql':
        # 64-bit key derived from address for advisory lock
        h = int(hashlib.sha256(addr.encode('utf-8')).hexdigest()[:16], 16)
        with connection.cursor() as cur:
            cur.execute("SELECT pg_advisory_xact_lock(%s)", [h])
    else:
        # SQLite has no advisory locks; emulate with a row lock
        # This safely nests inside surrounding transactions.
        with transaction.atomic():
            UserWallet.objects.select_for_update().get_or_create(address=addr)
