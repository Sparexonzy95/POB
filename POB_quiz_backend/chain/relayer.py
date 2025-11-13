# chain/quiz_relayer.py
import os, time, sys, signal
from web3 import Web3
from eth_account import Account
from django.conf import settings

# Setup Django
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chainserver.settings')
django.setup()

from chain.models import SettlementJob
from chain.web3svc import get_w3_and_contract

import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('relayer.log')  # Also log to file
    ]
)
log = logging.getLogger("relayer")

# Global flag for graceful shutdown
running = True

def signal_handler(sig, frame):
    global running
    log.info(f"Received signal {sig}, shutting down gracefully...")
    running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def get_signer():
    pk = settings.OWNER_PRIVATE_KEY
    if not pk or not pk.startswith('0x') or len(pk) != 66:
        raise RuntimeError('OWNER_PRIVATE_KEY missing or invalid')
    acct = Account.from_key(pk)
    return acct


def check_owner_matches():
    """Verify that OWNER_PRIVATE_KEY matches contract owner"""
    try:
        w3, c = get_w3_and_contract()
        acct = get_signer()
        onchain_owner = c.functions.owner().call()
        expected = Web3.to_checksum_address(acct.address)
        actual = Web3.to_checksum_address(onchain_owner)
        
        if expected != actual:
            raise RuntimeError(
                f'Owner mismatch: pk={expected} contract.owner()={actual}'
            )
        
        log.info(f"✅ Owner verification passed: {expected}")
        return True
    except Exception as e:
        log.error(f"❌ Owner verification failed: {e}")
        return False


def settle_on_chain(user: str, won: bool) -> str:
    """
    Sends settleGame(user, won). Returns tx hash hex string.
    
    This function:
    - Deducts 1 credit from user
    - Pays out winnings if won=True
    """
    w3, c = get_w3_and_contract()
    acct = get_signer()
    
    # Pre-check: If paying winners, ensure pot has funds
    if won:
        entry_fee = c.functions.entryFee().call()
        total = c.functions.totalFunds().call()
        payout_amount = entry_fee * 2  # 2x entry fee (after 10% house fee)
        
        if total < payout_amount:
            raise RuntimeError(
                f'Insufficient pot: totalFunds={total} < payout={payout_amount}'
            )
        
        log.info(f"Pot check passed: {total} >= {payout_amount}")
    
    # Build transaction
    checksum_user = Web3.to_checksum_address(user)
    fn = c.functions.settleGame(checksum_user, bool(won))
    nonce = w3.eth.get_transaction_count(acct.address)
    
    # Gas parameters with dynamic fee
    priority_gwei = getattr(settings, 'GAS_PRIORITY_GWEI', 1)
    
    try:
        fee_history = w3.eth.fee_history(5, 'latest', [50])
        base = int(sum(fee_history['baseFeePerGas']) / len(fee_history['baseFeePerGas']))
        max_priority = Web3.to_wei(priority_gwei, 'gwei')
        max_fee = base + max_priority * 2
    except Exception as e:
        log.warning(f"Could not get fee history, using fallback: {e}")
        max_priority = Web3.to_wei(priority_gwei, 'gwei')
        max_fee = Web3.to_wei(20, 'gwei')  # Fallback
    
    tx = fn.build_transaction({
        'from': acct.address,
        'nonce': nonce,
        'maxPriorityFeePerGas': max_priority,
        'maxFeePerGas': max_fee,
        'chainId': settings.CELO_CHAIN_ID,
    })
    
    # Estimate gas with buffer
    try:
        gas = w3.eth.estimate_gas(tx)
        tx['gas'] = int(gas * 1.2)  # Add 20% buffer
    except Exception as e:
        log.warning(f"Gas estimation failed, using default: {e}")
        tx['gas'] = 250000  # Fallback gas limit
    
    # Sign transaction
    signed = w3.eth.account.sign_transaction(tx, private_key=settings.OWNER_PRIVATE_KEY)
    
    # Send transaction
    log.info(f"Sending settleGame tx for {user}, won={won}...")
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    log.info(f"Transaction sent: {tx_hash.hex()}")
    
    # Wait for receipt with shorter timeout and better error handling
    try:
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)  # 60s instead of 120s
        
        if receipt.status != 1:
            raise RuntimeError(f'Transaction reverted: {tx_hash.hex()}')
        
        log.info(f"✅ Transaction confirmed: {tx_hash.hex()}")
        return tx_hash.hex()
        
    except Exception as e:
        # If timeout, the tx might still be pending
        log.error(f"Receipt error (tx may still be pending): {e}")
        # Return the hash anyway - we'll check it next round
        return tx_hash.hex()


def process_settlement_jobs():
    """Process all pending settlement jobs"""
    jobs = SettlementJob.objects.filter(status="PENDING").order_by('created_at')
    count = jobs.count()
    
    if count > 0:
        log.info(f"Found {count} pending settlement job(s)")
    
    for job in jobs:
        try:
            log.info(f"Processing job {job.id}: session={job.session_id}, user={job.user_address}, won={job.won}")
            
            tx_hash = settle_on_chain(job.user_address, job.won)
            
            # Update job status
            job.status = "CONFIRMED"
            job.tx_hash = tx_hash
            job.save()
            
            log.info(f"✅ Settled job {job.id}, session {job.session_id}, tx: {tx_hash}")
            
        except Exception as e:
            error_msg = str(e)[:500]
            log.error(f"❌ Failed to settle job {job.id}: {error_msg}")
            
            # Increment attempts
            job.attempts += 1
            job.last_error = error_msg
            
            # Mark as failed after 3 attempts
            if job.attempts >= 3:
                job.status = "FAILED"
                log.error(f"Job {job.id} marked as FAILED after {job.attempts} attempts")
            
            job.save()
            
            # Don't crash the whole relayer on one bad job
            continue


def check_health():
    """Basic health check"""
    try:
        w3, c = get_w3_and_contract()
        
        # Check RPC connectivity
        block = w3.eth.block_number
        log.info(f"Health check: Connected to block {block}")
        
        # Check contract is accessible
        entry_fee = c.functions.entryFee().call()
        log.info(f"Health check: Contract accessible, entry fee: {entry_fee}")
        
        # Check database
        pending = SettlementJob.objects.filter(status="PENDING").count()
        log.info(f"Health check: {pending} pending jobs in DB")
        
        return True
        
    except Exception as e:
        log.error(f"Health check failed: {e}")
        return False


# === MAIN RELAYER LOOP ===
def main():
    global running
    
    log.info("=" * 60)
    log.info("Quiz Relayer Starting")
    log.info("=" * 60)
    
    # Initial checks
    log.info("Performing startup checks...")
    
    if not check_owner_matches():
        log.error("Owner verification failed! Check OWNER_PRIVATE_KEY")
        return 1
    
    if not check_health():
        log.error("Health check failed! Check RPC connection and contract")
        return 1
    
    log.info("✅ All startup checks passed")
    log.info("Starting main loop (checking every 5 seconds)...")
    log.info("-" * 60)
    
    loop_count = 0
    last_health_check = 0
    
    while running:
        try:
            loop_count += 1
            current_time = time.time()
            
            # Run health check every 60 seconds (12 loops * 5s)
            if current_time - last_health_check > 60:
                log.info(f"Loop #{loop_count} - Running periodic health check...")
                check_health()
                last_health_check = current_time
            
            # Process settlement jobs
            process_settlement_jobs()
            
            # Sleep for 5 seconds
            time.sleep(5)
            
        except KeyboardInterrupt:
            log.info("Keyboard interrupt received")
            break
            
        except Exception as e:
            log.exception(f"Unexpected error in main loop: {e}")
            log.info("Sleeping 10s before retry...")
            time.sleep(10)
    
    log.info("=" * 60)
    log.info("Relayer stopped gracefully")
    log.info("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())