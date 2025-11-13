from decimal import Decimal
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from web3 import Web3

from .web3svc import get_w3_and_contract

def _addr_from_header(request) -> str:
    return (request.headers.get('X-Addr') or '').lower()

def _is_owner(addr_lower: str, contract) -> bool:
    # Prefer on-chain owner()
    try:
        onchain_owner = contract.functions.owner().call()
        if onchain_owner and onchain_owner.lower() == addr_lower:
            return True
    except Exception:
        pass

    # Fallback to settings.HOUSE_ADDRESS if provided
    house = (getattr(settings, 'HOUSE_ADDRESS', '') or '').lower()
    if house and house == addr_lower:
        return True

    return False

@api_view(['POST'])
def tournament_create(request):
    """
    Build a transaction to create a tournament.

    Request JSON:
    {
      "entryFeeCUSD": number,
      "registrationPeriodSec": number,   # e.g. 3600 (>= 1 hour as per contract)
      "playPeriodSec": number,           # e.g. 7200  (>= 1 hour as per contract)
      "questionsPerSession": number,     # 1..50
      "timePerQuestion": number          # 1..60 (seconds)
    }

    Returns:
      { "tx": { "from", "to", "data" } }
    """
    addr = _addr_from_header(request)
    if not addr:
        return Response({'error': 'auth required (X-Addr header)'}, status=401)

    w3, contract = get_w3_and_contract()

    if not _is_owner(addr, contract):
        return Response({'error': 'forbidden: only owner/house wallet'}, status=403)

    body = request.data or {}
    try:
        entry_fee_cusd = Decimal(str(body.get('entryFeeCUSD', '0')))
        reg_sec = int(body.get('registrationPeriodSec'))
        play_sec = int(body.get('playPeriodSec'))
        qps = int(body.get('questionsPerSession'))
        tpq = int(body.get('timePerQuestion'))
    except Exception:
        return Response({'error': 'invalid payload'}, status=400)

    # Basic guards matching contract constraints
    if entry_fee_cusd <= 0:
        return Response({'error': 'entryFeeCUSD must be > 0'}, status=400)
    if reg_sec <= 0 or play_sec <= 0:
        return Response({'error': 'periods must be > 0 (seconds)'}, status=400)
    if qps <= 0 or qps > 50:
        return Response({'error': 'questionsPerSession must be 1..50'}, status=400)
    if tpq <= 0 or tpq > 60:
        return Response({'error': 'timePerQuestion must be 1..60'}, status=400)

    # Convert cUSD → wei (18 decimals)
    entry_fee_wei = int(entry_fee_cusd * (10 ** 18))

    # ✅ Correct 5-arg encoding for TournamentQuizV2.createTournament
    try:
        data = contract.encodeABI(
            fn_name='createTournament',
            args=[entry_fee_wei, reg_sec, play_sec, qps, tpq]
        )
    except Exception as e:
        return Response({'error': f'encode failed: {e}'}, status=400)

    tx = {
        'from': Web3.to_checksum_address(addr),
        'to': contract.address,
        'data': data,
        # Optionally suggest gas/gasPrice here
        # 'gasPrice': hex(w3.to_wei(getattr(settings, 'GAS_PRIORITY_GWEI', 1), 'gwei')),
    }
    return Response({'tx': tx})
