import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chainserver.settings")
import django; django.setup()
import pytest
from django.conf import settings

class Fn:
    def __init__(self, ret=None):
        self._ret = ret
    def call(self): return self._ret

class Events:
    def __init__(self, logs):
        self._logs = logs
    def __call__(self): 
        class _E:
            def __init__(self, logs): self._logs = logs
            def get_logs(self, fromBlock=None, toBlock=None): return self._logs
        return _E(self._logs)

class MockContract:
    def __init__(self, entryFee=10**18, credits=1, cUSD='0x'+'0'*40, totalFunds=10**20, logs=None):
        self._entryFee = entryFee
        self._credits = credits
        self._cUSD = cUSD
        self._totalFunds = totalFunds
        self.functions = self
        self.events = type('E', (), {})()
        for name in ['EntryFeePaid','GameSettled','EntryFeeUpdated','HouseFeePercentUpdated','HouseFunded','OwnershipTransferred']:
            setattr(self.events, name, Events(logs or []))
    # function shims
    def entryFee(self): return Fn(self._entryFee)
    def houseFeePercent(self): return Fn(10)
    def cUSD(self): return Fn(self._cUSD)
    def totalFunds(self): return Fn(self._totalFunds)
    def credits(self, addr): return Fn(self._credits)

class MockW3:
    def __init__(self, block=123): self.eth = type('E', (), {'block_number': block})()

@pytest.fixture(autouse=True)
def mock_web3svc(monkeypatch):
    from chain import web3svc
    def fake_get():
        return (MockW3(), MockContract())
    monkeypatch.setattr(web3svc, 'get_w3_and_contract', fake_get)
    yield

@pytest.fixture
def client_with_addr(client):
    client.defaults['HTTP_X_ADDR'] = '0xabc0000000000000000000000000000000000000'
    return client
