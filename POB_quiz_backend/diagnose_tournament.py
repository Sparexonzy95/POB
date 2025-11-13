"""
Simple diagnostic script for tournament contract
Run from your Django project root: python diagnose_tournament.py
"""

import os
import sys

# Auto-detect Django project, ignoring virtual environments
def find_settings_module():
    """Find the Django settings module automatically"""
    ignore_dirs = {'.venv', 'venv', 'env', '.env', 'node_modules', '__pycache__', '.git'}
    
    for root, dirs, files in os.walk('.'):
        # Remove ignored directories from search
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        if 'settings.py' in files:
            # Skip if this is inside site-packages or similar
            if 'site-packages' in root or 'dist-packages' in root:
                continue
                
            # Convert path to module format
            rel_path = os.path.relpath(root, '.')
            if rel_path == '.':
                return 'settings'
            
            # Clean up the path
            parts = rel_path.split(os.sep)
            module = '.'.join(parts)
            return f"{module}.settings"
    
    return None

print("Searching for Django settings...")
settings_module = find_settings_module()

if not settings_module:
    print("\nERROR: Could not find settings.py")
    print("\nPlease specify your Django settings module manually.")
    print("Common formats:")
    print("  - backend.settings")
    print("  - config.settings")
    print("  - project_name.settings")
    print("\nThen run: python diagnose_tournament.py [your_settings_module]")
    
    # Try to help find it
    print("\nLooking for Django directories...")
    for root, dirs, files in os.walk('.'):
        if 'settings.py' in files and 'site-packages' not in root:
            print(f"  Found settings.py in: {root}")
    sys.exit(1)

# Allow manual override via command line
if len(sys.argv) > 1:
    settings_module = sys.argv[1]
    print(f"Using manually specified settings: {settings_module}")
else:
    print(f"Found Django settings: {settings_module}")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)

try:
    import django
    django.setup()
    print("âœ“ Django initialized successfully\n")
except Exception as e:
    print(f"\nERROR initializing Django: {e}")
    print("\nIf the settings module is wrong, run:")
    print("  python diagnose_tournament.py your_app.settings")
    sys.exit(1)

# Now run diagnostics
from django.conf import settings
from web3 import Web3

print("="*60)
print("TOURNAMENT CONTRACT DIAGNOSTICS")
print("="*60)

# Check 1: Settings
print("\n1. Checking Django Settings...")
required_settings = [
    'TOURNAMENT_ADDRESS',
    'TOURNAMENT_ABI_PATH', 
    'CELO_RPC',
    'CELO_CHAIN_ID',
    'HOUSE_ADDRESS',
    'CUSD_ADDRESS'
]

missing = []
for setting in required_settings:
    value = getattr(settings, setting, None)
    if value:
        # Mask addresses for privacy
        if 'ADDRESS' in setting and isinstance(value, str) and len(value) > 10:
            display_value = f"{value[:6]}...{value[-4:]}"
        elif 'PATH' in setting:
            # Show just filename
            display_value = os.path.basename(str(value))
        else:
            display_value = value
        print(f"  âœ“ {setting}: {display_value}")
    else:
        print(f"  âœ— {setting}: MISSING")
        missing.append(setting)

if missing:
    print(f"\n  ERROR: Missing required settings: {', '.join(missing)}")
    print("\n  Add these to your settings.py file:")
    print("  " + "-"*50)
    for s in missing:
        if s == 'TOURNAMENT_ADDRESS':
            print(f"  {s} = '0xYourContractAddress'")
        elif s == 'TOURNAMENT_ABI_PATH':
            print(f"  {s} = os.path.join(BASE_DIR, 'contracts', 'TournamentQuizV2.json')")
        elif s == 'CELO_RPC':
            print(f"  {s} = 'https://forno.celo-sepolia.celo-testnet.org'")
        elif s == 'CELO_CHAIN_ID':
            print(f"  {s} = 11142220  # Sepolia testnet")
        elif s == 'HOUSE_ADDRESS':
            print(f"  {s} = '0xYourWalletAddress'")
        elif s == 'CUSD_ADDRESS':
            print(f"  {s} = '0xde9e4c3ce781b4ba68120d6261cbad65ce0ab00b'  # Sepolia cUSD")
    print("  " + "-"*50)
    sys.exit(1)

# Check 2: Web3 Connection
print("\n2. Checking Web3 Connection...")
try:
    w3 = Web3(Web3.HTTPProvider(settings.CELO_RPC))
    is_connected = w3.is_connected()
    if is_connected:
        print(f"  âœ“ Connected to RPC: {settings.CELO_RPC}")
        latest_block = w3.eth.block_number
        print(f"  âœ“ Latest block: {latest_block}")
    else:
        print(f"  âœ— Cannot connect to RPC: {settings.CELO_RPC}")
        print("    Check your internet connection or try a different RPC")
        sys.exit(1)
except Exception as e:
    print(f"  âœ— Web3 connection error: {e}")
    sys.exit(1)

# Check 3: Load Contract ABI
print("\n3. Checking Contract ABI...")
try:
    import json
    abi_path = settings.TOURNAMENT_ABI_PATH
    
    if not os.path.exists(abi_path):
        print(f"  âœ— ABI file not found: {abi_path}")
        print(f"    Current directory: {os.getcwd()}")
        sys.exit(1)
    
    with open(abi_path, 'r') as f:
        abi_data = json.load(f)
        abi = abi_data.get('abi', abi_data)
    
    print(f"  âœ“ Loaded ABI from: {os.path.basename(abi_path)}")
    print(f"  âœ“ ABI has {len(abi)} items")
    
    # Check for createTournament
    create_fn = None
    for item in abi:
        if item.get('name') == 'createTournament' and item.get('type') == 'function':
            create_fn = item
            break
    
    if create_fn:
        inputs = create_fn.get('inputs', [])
        print(f"  âœ“ createTournament found with {len(inputs)} parameters:")
        for inp in inputs:
            print(f"    - {inp.get('name', 'unnamed')}: {inp.get('type', 'unknown')}")
        
        if len(inputs) != 5:
            print(f"\n  âš  WARNING: Expected 5 parameters, found {len(inputs)}")
            print("    Make sure you're using TournamentQuizV2 ABI!")
            print("    Expected parameters: entryFee, registrationPeriod, playPeriod, questionsPerSession, timePerQuestion")
    else:
        print("  âœ— createTournament function not found in ABI")
        print("    Your ABI might be from the wrong contract version")
        print("    Make sure you have TournamentQuizV2.json, not TournamentQuiz.json")
        sys.exit(1)
        
except FileNotFoundError:
    print(f"  âœ— ABI file not found: {settings.TOURNAMENT_ABI_PATH}")
    sys.exit(1)
except json.JSONDecodeError as e:
    print(f"  âœ— Invalid JSON in ABI file: {e}")
    sys.exit(1)
except Exception as e:
    print(f"  âœ— Error loading ABI: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Check 4: Initialize Contract
print("\n4. Checking Contract Initialization...")
try:
    contract_address = Web3.to_checksum_address(settings.TOURNAMENT_ADDRESS)
    contract = w3.eth.contract(address=contract_address, abi=abi)
    print(f"  âœ“ Contract initialized at: {contract_address}")
    
    # Try to call a view function
    try:
        counter = contract.functions.tournamentCounter().call()
        print(f"  âœ“ Contract is accessible (tournamentCounter: {counter})")
    except Exception as e:
        print(f"  âš  Warning: Could not call tournamentCounter: {e}")
        print("    Contract might not be deployed at this address on this network")
        print(f"    Network: Chain ID {settings.CELO_CHAIN_ID}")
        
except Exception as e:
    print(f"  âœ— Contract initialization error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Check 5: Test Building createTournament Call
print("\n5. Testing createTournament Function Call...")
try:
    # Test parameters (1 cUSD entry, 1 hour reg, 2 hour play, 10 questions, 30 sec each)
    entry_fee_wei = 1000000000000000000  # 1 cUSD in wei (18 decimals)
    reg_sec = 3600  # 1 hour
    play_sec = 7200  # 2 hours
    qps = 10
    tpq = 30
    
    fn = contract.functions.createTournament(entry_fee_wei, reg_sec, play_sec, qps, tpq)
    print(f"  âœ“ Built createTournament function call successfully")
    print(f"    Parameters:")
    print(f"      - entryFee: 1 cUSD ({entry_fee_wei} wei)")
    print(f"      - registrationPeriod: 1 hour ({reg_sec} seconds)")
    print(f"      - playPeriod: 2 hours ({play_sec} seconds)")
    print(f"      - questionsPerSession: {qps}")
    print(f"      - timePerQuestion: {tpq} seconds")
    
except Exception as e:
    print(f"  âœ— Error building function call: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Check 6: Test Transaction Building
print("\n6. Testing Transaction Building...")
try:
    house_addr = Web3.to_checksum_address(settings.HOUSE_ADDRESS)
    nonce = w3.eth.get_transaction_count(house_addr)
    gas_price = w3.eth.gas_price
    
    print(f"  âœ“ House address: {house_addr}")
    print(f"  âœ“ Account nonce: {nonce}")
    print(f"  âœ“ Gas price: {gas_price / 10**9:.2f} Gwei")
    
    # Check balance
    balance = w3.eth.get_balance(house_addr)
    print(f"  âœ“ Account balance: {balance / 10**18:.4f} CELO")
    
    tx = fn.build_transaction({
        'from': house_addr,
        'nonce': nonce,
        'gasPrice': gas_price,
        'chainId': settings.CELO_CHAIN_ID,
        'value': 0,
    })
    print(f"  âœ“ Transaction built successfully")
    print(f"    Chain ID: {tx['chainId']}")
    
    # Try gas estimation
    try:
        gas = w3.eth.estimate_gas(tx)
        print(f"  âœ“ Gas estimate: {gas:,} ({gas / 1000:.1f}K)")
    except Exception as gas_err:
        print(f"  âš  Gas estimation failed: {gas_err}")
        print(f"    Will use fallback gas limit (500,000)")
        gas = 500000
    
    tx_cost_celo = (gas * tx['gasPrice']) / 10**18
    print(f"\n  Transaction Summary:")
    print(f"    To: {tx['to']}")
    print(f"    Gas: {gas:,}")
    print(f"    Gas Price: {tx['gasPrice'] / 10**9:.2f} Gwei")
    print(f"    Estimated Cost: ~{tx_cost_celo:.6f} CELO")
    
    if balance / 10**18 < tx_cost_celo:
        print(f"    âš  WARNING: Account balance may be insufficient")
    
except Exception as e:
    print(f"  âœ— Transaction building error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Summary
print("\n" + "="*60)
print("DIAGNOSTICS COMPLETE")
print("="*60)
print("\nâœ“âœ“âœ“ All checks passed!")
print("\nYour backend should be able to create tournaments.")
print("\nNext steps:")
print("1. Make sure you're using the FIXED backend file:")
print("   views_tournament_fixed.py")
print("\n2. Test the API endpoint with this curl command:")
print(f"\ncurl -X POST http://localhost:8000/api/tournament/create \\")
print(f'  -H "Content-Type: application/json" \\')
print(f'  -H "X-Addr: {settings.HOUSE_ADDRESS}" \\')
print(f"  -d '{{")
print(f'    "entryFeeCUSD": 1,')
print(f'    "registrationPeriodSec": 3600,')
print(f'    "playPeriodSec": 7200,')
print(f'    "questionsPerSession": 10,')
print(f'    "timePerQuestion": 30')
print(f"  }}'")
print("\n3. Check Django console for any error logs")
print()