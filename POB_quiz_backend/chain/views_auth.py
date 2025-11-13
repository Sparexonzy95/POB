
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Nonce, UserWallet
from .authutil import issue_nonce, verify_signature, mint_jwt

@api_view(['POST'])
def nonce(request):
    addr = (request.data.get('address','') or '').lower()
    if not addr: return Response({'error':'address required'}, status=400)
    value = issue_nonce()
    Nonce.objects.update_or_create(address=addr, defaults={'value': value})
    return Response({'nonce': value, 'message': f'Sign this nonce: {value}'})

@api_view(['POST'])
def verify(request):
    addr = (request.data.get('address','') or '').lower()
    sig  = request.data.get('signature','')
    msg  = request.data.get('message','')
    try:
        if not verify_signature(addr, msg, sig):
            return Response({'error':'bad signature'}, status=401)
    except Exception as e:
        return Response({'error': f'verification failed: {e}'}, status=400)
    UserWallet.objects.get_or_create(address=addr)
    token = mint_jwt(addr)
    return Response({'token': token})
