import json, functools
from web3 import Web3
from web3.middleware import geth_poa_middleware
from django.conf import settings

# --- EXISTING RPC INITIALIZATION ---
_w3 = Web3(Web3.HTTPProvider(settings.CELO_RPC))

# If you're on Sepolia (PoA chain), uncomment this:
# _w3.middleware_onion.inject(geth_poa_middleware, layer=0)


@functools.lru_cache(maxsize=1)
def _load_tournament_abi():
    with open(settings.TOURNAMENT_ABI_PATH, 'r') as f:
        raw = json.load(f)
    return raw.get('abi', raw)


def get_w3_and_tournament():
    abi = _load_tournament_abi()
    addr = Web3.to_checksum_address(settings.TOURNAMENT_ADDRESS)
    c = _w3.eth.contract(address=addr, abi=abi)
    return _w3, c


# ============================================================
#           ðŸ”¹ NEW HELPERS FOR HOUSE SIGNED TXS ðŸ”¹
# ============================================================

def get_house_account(w3: Web3):
    """
    Load the house wallet account from HOUSE_PK in settings.
    """
    pk = getattr(settings, "HOUSE_PK", None)
    if not pk:
        raise RuntimeError("HOUSE_PK missing in Django settings")
    return w3.eth.account.from_key(pk)


def send_tx_from_house(fn):
    """
    Build, sign, and broadcast a transaction from the house wallet
    for a given contract function (e.g. recordScore()).
    Returns the tx hash hex string.
    """
    w3, _ = get_w3_and_tournament()
    acct = get_house_account(w3)

    # Build tx
    txn = fn.build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "gasPrice": w3.eth.gas_price,
        "chainId": settings.CELO_CHAIN_ID,
        "value": 0,
    })

    # Estimate gas (optional but safe)
    try:
        txn["gas"] = w3.eth.estimate_gas(txn)
    except Exception:
        txn["gas"] = 400000  # fallback if estimate fails

    # Sign & send
    signed = acct.sign_transaction(txn)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    return w3.to_hex(tx_hash)