
# SinglePlayerQuiz — Django Backend (Celo)

Backend for your SinglePlayerQuiz contract (Celo mainnet). Includes:
- DRF endpoints for public state, user credits
- Session engine (start/answer/finish + autosubmit)
- Event indexer
- Pytest test-suite with web3 mocks

## 1) Requirements
- Python 3.11+
- (Dev) SQLite default; (Prod) Postgres 14+
- Node/React frontend optional

## 2) Setup
```bash
pip install -r requirements.txt
python manage.py migrate
```

Create `.env` in repo root (optional for dev):
```env
DJANGO_SECRET=change-me
JWT_SECRET=change-me
CELO_RPC=https://forno.celo.org
CELO_CHAIN_ID=42220
CONTRACT_ADDRESS=0xYourDeployedAddress
ABI_PATH=chain/abi.json
SETTLE_AUTOMATICALLY=false
QUIZ_PASS=10
```

## 3) Run server
```bash
python manage.py runserver
```

API base: `http://localhost:8000/api/`

- `GET /api/quiz/state`
- `GET /api/quiz/user?address=0x...`
- `POST /api/quiz/session/start` (send header `X-Addr: 0x...` in dev)
- `POST /api/quiz/session/answer` { sessionId, answers:[{questionId, optionId}] }
- `POST /api/quiz/session/finish` { sessionId }
- `GET  /api/quiz/session/status/<id>`

## 4) Tests
```bash
pytest -q
```

Tests mock web3 so they run offline.

## 5) Event indexer
```bash
python manage.py index_quiz
```

## 6) Autosubmit expired sessions
```bash
python manage.py autosubmit_sessions
```

## 7) Production notes
- Switch to Postgres by setting DB_* env vars
- Add JWT middleware to verify tokens instead of `X-Addr`
- Put Gunicorn/Uvicorn behind Nginx
- Schedule the two management commands with cron or Celery
