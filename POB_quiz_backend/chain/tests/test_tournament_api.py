import json
import types
import pytest
from django.urls import reverse
from django.conf import settings

# -------------------------
# Fake Web3 + Contract shim
# -------------------------

class _FnNoArgs:
    def __init__(self, ret=None, build=None):
        self._ret = ret
        self._build = build

    def call(self):
        return self._ret

    # For tx-producing functions we need build_transaction
    def build_transaction(self, tx):
        if callable(self._build):
            return self._build(tx)
        # default dummy
        tx = dict(tx)
        tx.update({
            "to": "0xTOURNAMENT",
            "data": "0xdeadbeef",
            "value": 0,
        })
        return tx

class _FnWithArgs:
    def __init__(self, builder):
        self._builder = builder  # returns a _FnNoArgs

    def __call__(self, *args, **kwargs):
        return self._builder(*args, **kwargs)

class FakeEth:
    def __init__(self, gas_price=10_000_000_000, nonce=7, estimate=21000):
        self.gas_price = gas_price
        self._nonce = nonce
        self._estimate = estimate

    def get_transaction_count(self, addr):
        assert addr.startswith("0x")
        return self._nonce

    def estimate_gas(self, tx):
        # You can assert the tx shape here if desired
        assert "to" in tx and "data" in tx and "from" in tx
        return self._estimate

class FakeContract:
    def __init__(self, address):
        self.address = address
        # Dynamic function map filled below
        self.functions = types.SimpleNamespace()

class FakeW3:
    def __init__(self, eth: FakeEth):
        self.eth = eth

# -------------------------
# Monkeypatch helper
# -------------------------

@pytest.fixture
def fake_w3_and_contract(monkeypatch):
    """
    Patches chain.web3svc_tournament.get_w3_and_tournament to return fakes
    with predictable values.
    """
    tournament_addr = "0x00000000000000000000000000000000000abcde"

    # Fake ETH context
    eth = FakeEth(gas_price=12_345_678_901, nonce=3, estimate=123456)
    w3 = FakeW3(eth)
    contract = FakeContract(address=tournament_addr)

    # ---- Read-only calls ----
    # getTournamentInfo(id) -> tuple per contract ABI
    info_tuple = (
        1_000_000_000_000_000_000,  # entryFee (1 cUSD with 18 decimals)
        1710000000,                 # registrationEndTime
        1710003600,                 # startTime
        1710010800,                 # endTime
        10,                         # questionsPerSession
        20,                         # timePerQuestion
        False,                      # settled
        5_000_000_000_000_000_000,  # totalPool (5 cUSD)
        42,                         # playerCount
    )

    def getTournamentInfo_builder(tid):
        assert isinstance(tid, int)
        return _FnNoArgs(ret=info_tuple)

    def getPlayers_builder(tid):
        return _FnNoArgs(ret=[
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
        ])

    def getTopPlayers_builder(tid, count):
        addrs = [
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
            "0x3333333333333333333333333333333333333333",
        ][:count]
        scores = [30, 20, 10][:count]
        return _FnNoArgs(ret=(addrs, scores))

    def getPlayerInfo_builder(tid, addr):
        assert addr.startswith("0x")
        return _FnNoArgs(ret=(True, 77))  # registered, totalPoints

    def getPlayerPasses_builder(tid, addr):
        return _FnNoArgs(ret=5)

    def HOUSE_FEE_PERCENT_builder():
        return _FnNoArgs(ret=20)

    def PASS_COST_PERCENT_builder():
        return _FnNoArgs(ret=100)

    # ---- Tx builders ----
    def register_builder(tid):
        # build_transaction stub fills to/data; web3 svc fills gas/etc
        def _build(tx):
            tx = dict(tx)
            tx.update({
                "to": tournament_addr,
                "data": "0xdeadbeef",
                "value": 0,
            })
            return tx
        return _FnNoArgs(build=_build)

    def buyPasses_builder(tid, amount):
        def _build(tx):
            tx = dict(tx)
            tx.update({
                "to": tournament_addr,
                "data": "0xfeedbead",
                "value": 0,
            })
            return tx
        return _FnNoArgs(build=_build)

    # Wire functions
    contract.functions.getTournamentInfo = _FnWithArgs(getTournamentInfo_builder)
    contract.functions.getPlayers = _FnWithArgs(getPlayers_builder)
    contract.functions.getTopPlayers = _FnWithArgs(getTopPlayers_builder)
    contract.functions.getPlayerInfo = _FnWithArgs(getPlayerInfo_builder)
    contract.functions.getPlayerPasses = _FnWithArgs(getPlayerPasses_builder)
    contract.functions.HOUSE_FEE_PERCENT = HOUSE_FEE_PERCENT_builder
    contract.functions.PASS_COST_PERCENT = PASS_COST_PERCENT_builder
    contract.functions.register = _FnWithArgs(register_builder)
    contract.functions.buyPasses = _FnWithArgs(buyPasses_builder)

    def fake_get_w3_and_tournament():
        return w3, contract

    monkeypatch.setattr(
        "chain.web3svc_tournament.get_w3_and_tournament",
        fake_get_w3_and_tournament,
        raising=True,
    )
    # Make sure chain ID / address are set
    monkeypatch.setattr(settings, "CELO_CHAIN_ID", 42220, raising=False)
    monkeypatch.setattr(settings, "TOURNAMENT_ADDRESS", tournament_addr, raising=False)

    return w3, contract

# -------------------------
# Tests
# -------------------------

@pytest.mark.django_db
def test_tournament_info(client, fake_w3_and_contract):
    resp = client.get("/api/tournament/1/info")
    assert resp.status_code == 200, resp.content
    data = resp.json()
    assert data["id"] == 1
    assert data["entryFee"] == "1000000000000000000"
    assert data["playerCount"] == 42
    assert data["houseFeePercent"] == 20
    assert data["passCostPercent"] == 100
    assert data["contract"].lower() == settings.TOURNAMENT_ADDRESS.lower()

@pytest.mark.django_db
def test_tournament_players(client, fake_w3_and_contract):
    resp = client.get("/api/tournament/2/players")
    assert resp.status_code == 200
    players = resp.json()["players"]
    assert len(players) == 2
    assert players[0].startswith("0x")

@pytest.mark.django_db
def test_tournament_leaderboard(client, fake_w3_and_contract):
    resp = client.get("/api/tournament/3/leaderboard?top=2")
    assert resp.status_code == 200
    top = resp.json()["top"]
    assert len(top) == 2
    assert {"address", "points"} <= set(top[0].keys())

@pytest.mark.django_db
def test_tournament_me_requires_address(client, fake_w3_and_contract):
    resp = client.get("/api/tournament/1/me")
    assert resp.status_code == 400

@pytest.mark.django_db
def test_tournament_me_ok_with_query_address(client, fake_w3_and_contract):
    addr = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    resp = client.get(f"/api/tournament/1/me?address={addr}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["address"].lower() == addr.lower()
    assert data["registered"] is True
    assert data["totalPoints"] == 77
    assert data["passes"] == 5

@pytest.mark.django_db
def test_register_tx_builds_unsigned_tx(client, fake_w3_and_contract):
    addr = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    resp = client.post(f"/api/tournament/4/register-tx", data=json.dumps({"address": addr}),
                       content_type="application/json")
    assert resp.status_code == 200, resp.content
    tx = resp.json()["tx"]
    # These are generated by the web3svc_tournament builder + our fakes
    assert tx["to"].lower() == settings.TOURNAMENT_ADDRESS.lower()
    assert tx["data"] == "0xdeadbeef"
    assert int(tx["gas"], 16) == 123456
    assert int(tx["gasPrice"], 16) == 12345678901
    assert tx["chainId"] == 42220
    assert tx["nonce"] == 3
    assert int(tx["value"], 16) == 0

@pytest.mark.django_db
def test_buy_passes_tx_amount_required(client, fake_w3_and_contract):
    addr = "0xcccccccccccccccccccccccccccccccccccccccc"
    # amount missing / 0 -> 400
    bad = client.post("/api/tournament/5/buy-passes-tx",
                      data=json.dumps({"address": addr, "amount": 0}),
                      content_type="application/json")
    assert bad.status_code == 400

@pytest.mark.django_db
def test_buy_passes_tx_ok(client, fake_w3_and_contract):
    addr = "0xcccccccccccccccccccccccccccccccccccccccc"
    good = client.post("/api/tournament/5/buy-passes-tx",
                       data=json.dumps({"address": addr, "amount": 3}),
                       content_type="application/json")
    assert good.status_code == 200
    tx = good.json()["tx"]
    assert tx["data"] == "0xfeedbead"
    assert tx["to"].lower() == settings.TOURNAMENT_ADDRESS.lower()
