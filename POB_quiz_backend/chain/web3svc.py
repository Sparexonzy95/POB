
import json, os
from functools import lru_cache
from web3 import Web3
from django.conf import settings

def load_abi(path):
    with open(path, 'r') as f:
        raw = json.load(f)
    return raw.get('abi', raw)

@lru_cache
def get_w3_and_contract():
    w3 = Web3(Web3.HTTPProvider(settings.CELO_RPC))
    addr = Web3.to_checksum_address(settings.CONTRACT_ADDRESS)
    abi = load_abi(settings.ABI_PATH)
    c = w3.eth.contract(address=addr, abi=abi)
    return w3, c
