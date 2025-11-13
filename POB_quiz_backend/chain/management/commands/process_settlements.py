# chain/management/commands/process_settlements.py
# Complete settlement processor for Docker deployment

import time
import sys
from django.core.management.base import BaseCommand
from django.conf import settings
from web3 import Web3
from eth_account import Account
from chain.models import SettlementJob
from chain.web3svc import get_w3_and_contract

import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger("settlement_processor")


class Command(BaseCommand):
    help = 'Process pending settlement jobs continuously'

    def handle(self, *args, **options):
        log.info("=" * 70)
        log.info("SETTLEMENT PROCESSOR STARTING")
        log.info("=" * 70)
        
        # Verify owner key
        if not self.verify_owner():
            log.error("❌ CRITICAL: Owner verification failed! Exiting...")
            return
        
        log.info("✅ Owner verification passed")
        
        # Initial health check
        self.health_check()
        
        log.info("")
        log.info("🔄 Starting main processing loop (checking every 5 seconds)...")
        log.info("-" * 70)
        
        loop_count = 0
        
        try:
            while True:
                loop_count += 1
                
                # Log loop number every 12 iterations (every minute)
                if loop_count % 12 == 0:
                    log.info(f"📊 Loop #{loop_count} - Running health check...")
                    self.health_check()
                
                # Process pending jobs
                try:
                    self.process_jobs()
                except Exception as e:
                    log.error(f"❌ Error in process_jobs: {e}")
                    log.exception("Full traceback:")
                
                # Sleep for 5 seconds
                time.sleep(5)
                
        except KeyboardInterrupt:
            log.info("")
            log.info("⚠️ Received shutdown signal, stopping gracefully...")
        except Exception as e:
            log.exception(f"💥 FATAL ERROR in main loop: {e}")
            raise
        finally:
            log.info("=" * 70)
            log.info("Settlement processor stopped")
            log.info("=" * 70)
    
    def verify_owner(self):
        """Verify OWNER_PRIVATE_KEY matches contract owner"""
        try:
            # Check if key is configured
            if not settings.OWNER_PRIVATE_KEY:
                log.error("OWNER_PRIVATE_KEY is not set in environment!")
                return False
            
            if not settings.OWNER_PRIVATE_KEY.startswith('0x'):
                log.error("OWNER_PRIVATE_KEY must start with '0x'")
                return False
            
            # Get Web3 and contract
            w3, c = get_w3_and_contract()
            
            # Load account from private key
            try:
                acct = Account.from_key(settings.OWNER_PRIVATE_KEY)
                log.info(f"Loaded account: {acct.address}")
            except Exception as e:
                log.error(f"Failed to load account from OWNER_PRIVATE_KEY: {e}")
                return False
            
            # Try to verify against contract owner
            try:
                owner_onchain = c.functions.owner().call()
                expected = Web3.to_checksum_address(acct.address)
                actual = Web3.to_checksum_address(owner_onchain)
                
                if expected != actual:
                    log.error(f"❌ Owner mismatch!")
                    log.error(f"   Private key account: {expected}")
                    log.error(f"   Contract owner:      {actual}")
                    return False
                
                log.info(f"✅ Owner matches: {expected}")
                
            except Exception as e:
                log.warning(f"Could not verify contract owner (function may not exist): {e}")
                log.info(f"Proceeding with account: {acct.address}")
            
            return True
            
        except Exception as e:
            log.exception(f"Owner verification error: {e}")
            return False
    
    def health_check(self):
        """Check system health"""
        try:
            # Check Web3 connection
            w3, c = get_w3_and_contract()
            block = w3.eth.block_number
            
            # Check database
            pending = SettlementJob.objects.filter(status='PENDING').count()
            confirmed = SettlementJob.objects.filter(status='CONFIRMED').count()
            failed = SettlementJob.objects.filter(status='FAILED').count()
            total = pending + confirmed + failed
            
            log.info(f"🏥 Health Check:")
            log.info(f"   Chain Block:     {block}")
            log.info(f"   Total Jobs:      {total}")
            log.info(f"   ⏳ Pending:      {pending}")
            log.info(f"   ✅ Confirmed:    {confirmed}")
            log.info(f"   ❌ Failed:       {failed}")
            
            # Check contract state
            try:
                entry_fee = c.functions.entryFee().call()
                total_funds = c.functions.totalFunds().call()
                log.info(f"   Contract Funds:  {total_funds} (entry fee: {entry_fee})")
            except:
                pass
            
        except Exception as e:
            log.error(f"❌ Health check failed: {e}")
    
    def process_jobs(self):
        """Process all pending settlement jobs"""
        # Get pending jobs
        jobs = SettlementJob.objects.filter(status='PENDING').order_by('created_at')
        count = jobs.count()
        
        if count == 0:
            return  # No jobs to process, don't log anything
        
        log.info(f"")
        log.info(f"🔍 Found {count} pending job(s) to process")
        log.info("-" * 70)
        
        # Process each job
        for job in jobs:
            try:
                log.info(f"")
                log.info(f"⚙️  Processing Job #{job.id}")
                log.info(f"   Session ID:   {job.session_id}")
                log.info(f"   User:         {job.user_address}")
                log.info(f"   Won:          {job.won}")
                log.info(f"   Attempts:     {job.attempts}")
                
                # Settle on-chain
                tx_hash = self.settle_on_chain(job.user_address, job.won)
                
                # Update job status
                job.status = 'CONFIRMED'
                job.tx_hash = tx_hash
                job.save()
                
                log.info(f"   ✅ SUCCESS!")
                log.info(f"   Tx Hash:      {tx_hash}")
                
            except Exception as e:
                error_msg = str(e)[:500]
                log.error(f"   ❌ FAILED: {error_msg}")
                
                # Update job with error info
                job.attempts += 1
                job.last_error = error_msg
                
                # Mark as failed after 3 attempts
                if job.attempts >= 3:
                    job.status = 'FAILED'
                    log.error(f"   ⚠️  Job marked as FAILED after 3 attempts")
                else:
                    log.warning(f"   ⚠️  Will retry (attempt {job.attempts + 1}/3)")
                
                job.save()
                
                # Continue processing other jobs
                continue
        
        log.info("")
        log.info("=" * 70)
    
    def settle_on_chain(self, user_address: str, won: bool) -> str:
        """
        Call settleGame on the smart contract.
        This deducts 1 credit and pays out if won=True.
        
        Args:
            user_address: Ethereum address of the player
            won: True if player won, False if they lost
            
        Returns:
            Transaction hash as hex string
        """
        w3, c = get_w3_and_contract()
        acct = Account.from_key(settings.OWNER_PRIVATE_KEY)
        
        # Pre-flight checks for winners
        if won:
            try:
                entry_fee = c.functions.entryFee().call()
                total_funds = c.functions.totalFunds().call()
                payout_amount = entry_fee * 2  # Assuming 2x entry fee payout
                
                if total_funds < payout_amount:
                    raise RuntimeError(
                        f'Insufficient contract funds: {total_funds} < {payout_amount}'
                    )
                
                log.info(f"   💰 Pot check OK: {total_funds} >= {payout_amount}")
            except Exception as e:
                if "Insufficient" in str(e):
                    raise
                log.warning(f"   ⚠️  Could not verify pot funds: {e}")
        
        # Build transaction
        checksum_user = Web3.to_checksum_address(user_address)
        settle_fn = c.functions.settleGame(checksum_user, bool(won))
        
        # Get nonce
        nonce = w3.eth.get_transaction_count(acct.address)
        log.info(f"   📝 Using nonce: {nonce}")
        
        # Gas parameters
        priority_gwei = getattr(settings, 'GAS_PRIORITY_GWEI', 2)
        
        try:
            # Try to get recent fee history for better gas pricing
            fee_history = w3.eth.fee_history(5, 'latest', [50])
            base_fee = int(sum(fee_history['baseFeePerGas']) / len(fee_history['baseFeePerGas']))
            max_priority = Web3.to_wei(priority_gwei, 'gwei')
            max_fee = base_fee + (max_priority * 2)
            
            log.info(f"   ⛽ Gas: base={base_fee}, priority={max_priority}, max={max_fee}")
            
        except Exception as e:
            # Fallback to simple gas pricing
            log.warning(f"   ⚠️  Fee history unavailable, using fallback: {e}")
            max_priority = Web3.to_wei(priority_gwei, 'gwei')
            max_fee = Web3.to_wei(20, 'gwei')
        
        # Build transaction params
        tx_params = {
            'from': acct.address,
            'nonce': nonce,
            'maxPriorityFeePerGas': max_priority,
            'maxFeePerGas': max_fee,
            'chainId': settings.CELO_CHAIN_ID,
        }
        
        # Build transaction
        tx = settle_fn.build_transaction(tx_params)
        
        # Estimate gas
        try:
            estimated_gas = w3.eth.estimate_gas(tx)
            tx['gas'] = int(estimated_gas * 1.3)  # Add 30% buffer
            log.info(f"   ⛽ Estimated gas: {estimated_gas}, using: {tx['gas']}")
        except Exception as e:
            log.warning(f"   ⚠️  Gas estimation failed, using default: {e}")
            tx['gas'] = 300000  # Safe default
        
        # Sign transaction
        log.info(f"   🔏 Signing transaction...")
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=settings.OWNER_PRIVATE_KEY)
        
        # Send transaction
        log.info(f"   📤 Sending transaction...")
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        tx_hash_hex = tx_hash.hex()
        
        log.info(f"   📨 Transaction sent: {tx_hash_hex}")
        log.info(f"   ⏳ Waiting for confirmation (timeout: 60s)...")
        
        # Wait for receipt
        try:
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            
            # Check if transaction succeeded
            if receipt.status != 1:
                raise RuntimeError(f'Transaction reverted: {tx_hash_hex}')
            
            log.info(f"   ✅ Confirmed in block {receipt.blockNumber}")
            log.info(f"   ⛽ Gas used: {receipt.gasUsed}")
            
            return tx_hash_hex
            
        except Exception as e:
            log.warning(f"   ⚠️  Receipt error (tx may still confirm): {e}")
            # Return the hash anyway - it might still get mined
            return tx_hash_hex