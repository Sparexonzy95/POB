# =====================================
# Django + Web3 backend for Celo Quiz
# =====================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Optional build deps (for psycopg2 / crypto libs)
RUN apt-get update && apt-get install -y build-essential curl libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Default command (the api); overridden in docker-compose
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
