
import os, jwt, secrets
from datetime import datetime, timedelta
from web3 import Web3

JWT_SECRET = os.getenv('JWT_SECRET','dev-jwt')

def issue_nonce():
    return secrets.token_urlsafe(24)

def verify_signature(address: str, message: str, signature: str) -> bool:
    w3 = Web3()
    recovered = w3.eth.account.recover_message(text=message, signature=signature)
    return recovered.lower() == address.lower()

def mint_jwt(address: str) -> str:
    now = datetime.utcnow()
    return jwt.encode({'sub': address, 'iat': now, 'exp': now + timedelta(days=7)}, JWT_SECRET, algorithm='HS256')
