from decimal import Decimal
from time import time as now_secs
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from web3 import Web3
from .web3svc_tournament import get_w3_and_tournament
import traceback

# --- minimal ERC20 ABI subset ---
ERC20_ABI = [
    {"constant": True, "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
     "name": "allowance", "outputs": [{"name": "", "type": "uint256"}], "payable": False, "stateMutability": "view", "type": "function"},
    {"constant": False, "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
     "name": "approve", "outputs": [{"name": "", "type": "bool"}], "payable": False, "stateMutability": "nonpayable", "type": "function"},
    {"constant": True, "inputs": [{"name": "account", "type": "address"}],
     "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "payable": False, "stateMutability": "view", "type": "function"},
    {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}],
     "payable": False, "stateMutability": "view", "type": "function"},
]

def _erc20_cusd(w3):
    addr = getattr(settings, 'CUSD_ADDRESS', None)
    if not addr:
        raise ValueError("CUSD_ADDRESS not configured in settings")
    return w3.eth.contract(address=_ck(addr), abi=ERC20_ABI)

def _ck(a: str) -> str:
    return Web3.to_checksum_address(a)

def _to_wei_cusd(x) -> int:
    return int(Decimal(str(x)) * (10 ** 18))

def _valid_tid_or_404(c, tid: int):
    try:
        counter = int(c.functions.tournamentCounter().call() or 0)
    except Exception as e:
        return False, None, Response({'error': f'failed: {e}'}, status=400)

    if tid <= 0 or tid > counter:
        return False, counter, Response({'error': 'tournament does not exist'}, status=404)
    return True, counter, None

def _get_info(c, tid: int):
    (entryFee, regEnd, start, end, qPer, tPer, settled, totalPool, playerCount) = \
        c.functions.getTournamentInfo(int(tid)).call()
    return {
        'id': int(tid),
        'entryFee': str(entryFee),
        'registrationEndTime': int(regEnd),
        'startTime': int(start),
        'endTime': int(end),
        'questionsPerSession': int(qPer),
        'timePerQuestion': int(tPer),
        'settled': bool(settled),
        'totalPool': str(totalPool),
        'playerCount': int(playerCount),
    }

# -------- discovery --------

@api_view(['GET'])
def tournament_list(request):
    _, c = get_w3_and_tournament()
    try:
        counter = int(c.functions.tournamentCounter().call() or 0)
        items = []
        for i in range(1, counter + 1):
            try:
                items.append(_get_info(c, i))
            except Exception:
                pass
        return Response({'items': items})
    except Exception as e:
        return Response({'error': f'failed: {e}'}, status=400)

@api_view(['GET'])
def tournament_latest(request):
    _, c = get_w3_and_tournament()
    try:
        counter = int(c.functions.tournamentCounter().call() or 0)
        for i in range(counter, 0, -1):
            try:
                return Response({'id': i, 'info': _get_info(c, i)})
            except Exception:
                continue
        return Response({'id': 0})
    except Exception as e:
        return Response({'error': f'failed: {e}'}, status=400)

# -------- reads --------

@api_view(['GET'])
def tournament_info(request, tid: int):
    _, c = get_w3_and_tournament()
    try:
        tid_int = int(tid)
        ok, _, err = _valid_tid_or_404(c, tid_int)
        if not ok:
            return err
        info = _get_info(c, tid_int)
        house = c.functions.HOUSE_FEE_PERCENT().call()
        passPct = c.functions.PASS_COST_PERCENT().call()
        info.update({
            'houseFeePercent': int(house),
            'passCostPercent': int(passPct),
            'contract': getattr(settings, 'TOURNAMENT_ADDRESS', ''),
        })
        return Response(info)
    except Exception as e:
        return Response({'error': f'failed: {e}'}, status=400)

@api_view(['GET'])
def tournament_players(request, tid: int):
    _, c = get_w3_and_tournament()
    try:
        tid_int = int(tid)
        ok, _, err = _valid_tid_or_404(c, tid_int)
        if not ok:
            return err
        players = c.functions.getPlayers(tid_int).call()
        return Response({'id': tid_int, 'players': players})
    except Exception as e:
        return Response({'error': f'failed: {e}'}, status=400)

@api_view(['GET'])
def tournament_leaderboard(request, tid: int):
    top = request.query_params.get('top', request.query_params.get('n', '10'))
    try:
        n = max(1, min(100, int(top)))
    except Exception:
        n = 10

    _, c = get_w3_and_tournament()
    try:
        tid_int = int(tid)
        ok, _, err = _valid_tid_or_404(c, tid_int)
        if not ok:
            return err

        addrs, scores = c.functions.getTopPlayers(tid_int, int(n)).call()
        scores_int = [int(s) for s in scores]
        return Response({'id': tid_int, 'players': addrs, 'scores': scores_int})
    except Exception as e:
        return Response({'error': f'failed: {e}'}, status=400)

@api_view(['GET'])
def tournament_me(request, tid: int):
    addr = (request.headers.get('X-Addr') or request.query_params.get('address') or '').strip()
    if not addr:
        return Response({'error': 'address required'}, status=400)

    _, c = get_w3_and_tournament()
    try:
        tid_int = int(tid)
        ok, _, err = _valid_tid_or_404(c, tid_int)
        if not ok:
            return err

        registered, total_points = c.functions.getPlayerInfo(tid_int, _ck(addr)).call()
        passes = c.functions.getPlayerPasses(tid_int, _ck(addr)).call()
        return Response({
            'id': tid_int,
            'address': addr,
            'registered': bool(registered),
            'totalPoints': int(total_points),
            'passes': int(passes),
        })
    except Exception as e:
        return Response({'error': f'failed: {e}'}, status=400)

# -------- tx builders --------

def _build_unsigned_tx(w3, from_addr, fn):
    """Build unsigned transaction with improved error handling"""
    try:
        from_ck = _ck(from_addr)
        nonce = w3.eth.get_transaction_count(from_ck)
        gas_price = w3.eth.gas_price

        draft = fn.build_transaction({
            'from': from_ck,
            'nonce': nonce,
            'gasPrice': gas_price,
            'chainId': settings.CELO_CHAIN_ID,
            'value': 0,
        })
        
        # Try to estimate gas, but use fallback if it fails
        try:
            gas = w3.eth.estimate_gas(draft)
        except Exception as gas_err:
            print(f"Gas estimation failed: {gas_err}, using fallback")
            # Fallback gas limits based on function type
            gas = 500000  # Safe default for create tournament
            
        draft['gas'] = gas
        
        return {
            'to': draft['to'],
            'data': draft['data'],
            'gas': hex(draft['gas']),
            'gasPrice': hex(draft['gasPrice']),
            'chainId': draft['chainId'],
            'nonce': draft['nonce'],
            'value': hex(draft.get('value', 0)),
        }
    except Exception as e:
        print(f"Error building transaction: {e}")
        print(traceback.format_exc())
        raise

@api_view(['POST'])
def tournament_register_tx(request, tid: int):
    addr = (request.headers.get('X-Addr') or request.data.get('address') or '').strip()
    if not addr:
        return Response({'error': 'address required'}, status=400)
    w3, c = get_w3_and_tournament()
    try:
        tid_int = int(tid)
        ok, _, err = _valid_tid_or_404(c, tid_int)
        if not ok:
            return err
        tx = _build_unsigned_tx(w3, addr, c.functions.register(tid_int))
        return Response({'tx': tx})
    except Exception as e:
        print(f"Register tx error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'failed: {e}'}, status=400)

@api_view(['POST'])
def tournament_buy_passes_tx(request, tid: int):
    addr = (request.headers.get('X-Addr') or request.data.get('address') or '').strip()
    amount = int(request.data.get('amount') or 0)
    if not addr:
        return Response({'error': 'address required'}, status=400)
    if amount <= 0:
        return Response({'error': 'amount > 0 required'}, status=400)
    w3, c = get_w3_and_tournament()
    try:
        tid_int = int(tid)
        ok, _, err = _valid_tid_or_404(c, tid_int)
        if not ok:
            return err
        tx = _build_unsigned_tx(w3, addr, c.functions.buyPasses(tid_int, int(amount)))
        return Response({'tx': tx})
    except Exception as e:
        print(f"Buy passes tx error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'failed: {e}'}, status=400)

@api_view(['POST'])
def tournament_create_tx(request):
    addr = (request.headers.get('X-Addr') or request.data.get('address') or '').strip()
    if not addr:
        return Response({'error': 'address required'}, status=400)

    house = (getattr(settings, 'HOUSE_ADDRESS', '') or '').lower()
    if house and addr.lower() != house:
        return Response({'error': 'only house wallet can create tournaments'}, status=403)

    b = request.data or {}
    
    try:
        # Parse and validate inputs
        entry_fee_cusd = b.get('entryFeeCUSD', 0)
        reg_sec = b.get('registrationPeriodSec', 0)
        play_sec = b.get('playPeriodSec', 0)
        qps = b.get('questionsPerSession', 0)
        tpq = b.get('timePerQuestion', 0)
        
        print(f"Creating tournament with params: entryFee={entry_fee_cusd}, regSec={reg_sec}, playSec={play_sec}, qps={qps}, tpq={tpq}")
        
        entry_fee_wei = _to_wei_cusd(entry_fee_cusd)
        reg_sec = int(reg_sec)
        play_sec = int(play_sec)
        qps = int(qps)
        tpq = int(tpq)
        
    except Exception as e:
        print(f"Param parsing error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'bad params: {e}'}, status=400)

    if not all(x > 0 for x in [entry_fee_wei, reg_sec, play_sec, qps, tpq]):
        return Response({'error': 'all numeric fields must be > 0'}, status=400)

    w3, c = get_w3_and_tournament()
    
    try:
        # Build the function call
        fn = c.functions.createTournament(entry_fee_wei, reg_sec, play_sec, qps, tpq)
        print(f"Built function call successfully")
        
        # Build the transaction
        tx = _build_unsigned_tx(w3, addr, fn)
        print(f"Built transaction successfully: {tx}")
        
        return Response({'tx': tx})
        
    except Exception as e:
        print(f"Create tournament error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'failed: {str(e)}'}, status=500)

@api_view(['POST'])
def tournament_settle_tx(request, tid: int):
    """
    Owner settle. The contract now handles refunds automatically:
    - If <2 players at settlement time, contract refunds everyone
    - If â‰¥2 players, normal settlement occurs
    """
    addr = (request.headers.get('X-Addr') or request.data.get('address') or '').strip()
    if not addr:
        return Response({'error': 'address required'}, status=400)

    house = (getattr(settings, 'HOUSE_ADDRESS', '') or '').lower()
    if house and addr.lower() != house:
        return Response({'error': 'only house wallet can settle tournaments'}, status=403)

    w3, c = get_w3_and_tournament()
    try:
        tid_int = int(tid)
        ok, _, err = _valid_tid_or_404(c, tid_int)
        if not ok:
            return err

        info = _get_info(c, tid_int)
        if int(now_secs()) <= int(info['endTime']):
            return Response({'error': 'tournament not ended yet'}, status=409)
        
        # Note: We no longer require â‰¥2 players - contract handles single player refund
        fn = c.functions.settleTournament(tid_int)
        tx = _build_unsigned_tx(w3, addr, fn)
        return Response({
            'tx': tx, 
            'fn': 'settleTournament',
            'note': 'Contract will auto-refund if only 1 player registered'
        })
    except Exception as e:
        print(f"Settle tx error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'failed: {e}'}, status=400)

@api_view(['POST'])
def tournament_refund_tx(request, tid: int):
    """
    Owner refund/cancel path (pre-start only).
    """
    addr = (request.headers.get('X-Addr') or request.data.get('address') or '').strip()
    if not addr:
        return Response({'error': 'address required'}, status=400)

    house = (getattr(settings, 'HOUSE_ADDRESS', '') or '').lower()
    if house and addr.lower() != house:
        return Response({'error': 'only house wallet can refund tournaments'}, status=403)

    w3, c = get_w3_and_tournament()
    try:
        tid_int = int(tid)
        ok, _, err = _valid_tid_or_404(c, tid_int)
        if not ok:
            return err

        info = _get_info(c, tid_int)
        if int(now_secs()) >= int(info['startTime']):
            return Response({'error': 'tournament already started; use settle instead'}, status=409)

        if not hasattr(c.functions, 'cancelTournament'):
            return Response({'error': 'cancelTournament not found in contract ABI'}, status=400)

        fn = c.functions.cancelTournament(tid_int)
        tx = _build_unsigned_tx(w3, addr, fn)
        return Response({'tx': tx, 'fn': 'cancelTournament'})
    except Exception as e:
        print(f"Refund tx error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'failed: {e}'}, status=400)

@api_view(['POST'])
def tournament_resolve_tx(request, tid: int):
    """
    Unified resolver with updated logic for single-player refunds:
      - before start  -> cancelTournament (refund all)
      - after end -> settleTournament (contract auto-refunds if 1 player, settles if â‰¥2)
      - during play   -> 409
    """
    addr = (request.headers.get('X-Addr') or request.data.get('address') or '').strip()
    if not addr:
        return Response({'error': 'address required'}, status=400)

    house = (getattr(settings, 'HOUSE_ADDRESS', '') or '').lower()
    if house and addr.lower() != house:
        return Response({'error': 'only house wallet can resolve tournaments'}, status=403)

    w3, c = get_w3_and_tournament()
    try:
        tid_int = int(tid)
        ok, _, err = _valid_tid_or_404(c, tid_int)
        if not ok:
            return err

        info = _get_info(c, tid_int)
        now = int(now_secs())
        start = int(info['startTime'])
        end = int(info['endTime'])
        players = int(info['playerCount'])

        # Pre-start: cancel and refund
        if now < start:
            if not hasattr(c.functions, 'cancelTournament'):
                return Response({'error': 'cancelTournament not in ABI'}, status=400)
            fn = c.functions.cancelTournament(tid_int)
            tx = _build_unsigned_tx(w3, addr, fn)
            return Response({
                'tx': tx, 
                'action': 'cancelTournament', 
                'mode': 'refund-prestart',
                'note': f'Will refund all {players} registered player(s)'
            })

        # During play: no action
        if start <= now <= end:
            return Response({'error': 'tournament in progress; no admin action allowed'}, status=409)

        # Post-end: always use settleTournament - contract handles the logic
        fn = c.functions.settleTournament(tid_int)
        tx = _build_unsigned_tx(w3, addr, fn)
        
        if players == 1:
            return Response({
                'tx': tx, 
                'action': 'settleTournament', 
                'mode': 'refund-single-player',
                'note': 'Contract will automatically refund the single registered player'
            })
        elif players >= 2:
            return Response({
                'tx': tx, 
                'action': 'settleTournament', 
                'mode': 'settle',
                'note': f'Will distribute prizes to top players from {players} participants'
            })
        else:
            # 0 players - just mark as settled
            return Response({
                'tx': tx, 
                'action': 'settleTournament', 
                'mode': 'settle-empty',
                'note': 'No players registered, will just mark tournament as settled'
            })

    except Exception as e:
        print(f"Resolve tx error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'failed: {e}'}, status=400)

# -------- ERC20 helpers --------

@api_view(['GET'])
def erc20_allowance(request):
    owner = (request.query_params.get('owner') or '').strip()
    spender = (request.query_params.get('spender') or '').strip()
    if not owner or not spender:
        return Response({'error': 'owner and spender required'}, status=400)

    w3, _ = get_w3_and_tournament()
    try:
        token = _erc20_cusd(w3)
        amt = token.functions.allowance(_ck(owner), _ck(spender)).call()
        return Response({'allowance': str(int(amt))})
    except Exception as e:
        print(f"Allowance error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'failed: {e}'}, status=400)

@api_view(['POST'])
def erc20_approve_tx(request):
    addr = (request.headers.get('X-Addr') or request.data.get('address') or '').strip()
    spender = (request.data.get('spender') or '').strip()
    amount_raw = request.data.get('amountWei')

    if not addr:
        return Response({'error': 'address required'}, status=400)
    if not spender:
        return Response({'error': 'spender required'}, status=400)
    try:
        amount = int(str(amount_raw))
        if amount <= 0:
            return Response({'error': 'amountWei must be > 0'}, status=400)
    except Exception:
        return Response({'error': 'amountWei must be integer string/number'}, status=400)

    w3, _ = get_w3_and_tournament()
    try:
        token = _erc20_cusd(w3)
        tx = _build_unsigned_tx(w3, addr, token.functions.approve(_ck(spender), amount))
        return Response({'tx': tx})
    except Exception as e:
        print(f"Approve tx error: {e}")
        print(traceback.format_exc())
        return Response({'error': f'failed: {e}'}, status=400)