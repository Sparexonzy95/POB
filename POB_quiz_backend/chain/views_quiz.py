
from rest_framework.decorators import api_view
from rest_framework.response import Response
from web3 import Web3
from decimal import Decimal, getcontext, ROUND_DOWN
from .web3svc import get_w3_and_contract
from chain.models import QuizSession 
from django.http import JsonResponse
from django.db.models import Count, Sum
from django.conf import settings

# set enough precision
getcontext().prec = 36

TOKEN_DECIMALS = 6  # ✅ cUSD on Celo uses 6 decimals


@api_view(['GET'])
def quiz_public_state(request):
    _, c = get_w3_and_contract()
    entry_fee = c.functions.entryFee().call()
    house_fee = c.functions.houseFeePercent().call()
    cusd_addr = c.functions.cUSD().call()
    total_funds = c.functions.totalFunds().call()
    return Response({
        'entryFee': str(entry_fee),
        'houseFeePercent': int(house_fee),
        'cUSD': cusd_addr,
        'totalFunds': str(total_funds)
    })

@api_view(['GET'])
def quiz_user_view(request):
    addr = request.query_params.get('address')
    if not addr: return Response({'error':'address required'}, status=400)
    _, c = get_w3_and_contract()
    credits = c.functions.credits(Web3.to_checksum_address(addr)).call()
    return Response({'address': addr, 'credits': int(credits)})


# views_quiz.py (append these at bottom or insert properly with your imports)
from django.http import JsonResponse
from django.conf import settings

def quiz_settings(request):
    """
    Public config values for front-end (entry fee, time limit, etc).
    Adjust to read actual values from settings / contract / DB as needed.
    """
    data = {
        "entry_fee": getattr(settings, "QUIZ_PASS", 10),         # or entry fee in wei if you prefer
        "entry_fee_wei": getattr(settings, "QUIZ_ENTRY_FEE", 10000000000000) if hasattr(settings, "QUIZ_ENTRY_FEE") else None,
        "timeLimit": getattr(settings, "QUIZ_TIME_LIMIT", 10),  # seconds
        "questionsPerQuiz": 10,
        "version": "0.1"
    }
    return JsonResponse(data)


def quiz_stats(request):
    address = request.GET.get('address') or request.headers.get('X-Addr')
    if address:
        address = address.strip().lower()

    base_qs = QuizSession.objects.filter(finished_at__isnull=False)
    if address:
        base_qs = base_qs.filter(user_address__iexact=address)

    played = base_qs.count()
    won = base_qs.filter(passed=True).count()

    agg = base_qs.aggregate(total_smallest=Sum('payout_amount_smallest'))
    total_smallest = agg['total_smallest'] or 0

    total_decimal = (Decimal(total_smallest) / (Decimal(10) ** TOKEN_DECIMALS)).quantize(
        Decimal('0.000001'), rounding=ROUND_DOWN
    )

    data = {
        "played": played,
        "won": won,
        "winRate": int((won / played) * 100) if played > 0 else 0,
        "totalEarnings": str(total_decimal),
        "currency": "cUSD",
    }
    return JsonResponse(data)