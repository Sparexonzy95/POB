from corsheaders.defaults import default_headers
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET', 'dev-secret-change')
DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'chain',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'chainserver.urls'
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ],},
}]
WSGI_APPLICATION = 'chainserver.wsgi.application'

# Default to SQLite for quick start; override via env for Postgres
if os.getenv('DB_NAME'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME'),
            'USER': os.getenv('DB_USER', 'postgres'),
            'PASSWORD': os.getenv('DB_PASS', ''),
            'HOST': os.getenv('DB_HOST', '127.0.0.1'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }
else:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-addr',  # <- allow our custom auth header
]
TIME_ZONE = 'UTC'
USE_TZ = True
STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
}

# App env - READ FROM ENVIRONMENT VARIABLES
CELO_RPC = os.getenv('CELO_RPC', 'https://forno.celo-sepolia.celo-testnet.org')
CELO_CHAIN_ID = int(os.getenv('CELO_CHAIN_ID', '11142220'))
CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS', '0x0000000000000000000000000000000000000000')
ABI_PATH = os.getenv('ABI_PATH', str(BASE_DIR / 'chain' / 'abi.json'))
JWT_SECRET = os.getenv('JWT_SECRET', 'dev-jwt')
SETTLE_AUTOMATICALLY = os.getenv('SETTLE_AUTOMATICALLY', 'false').lower() == 'true'
QUIZ_PASS = int(os.getenv('QUIZ_PASS', '10'))
QUIZ_TIME_LIMIT = int(os.getenv('QUIZ_TIME_LIMIT', '100'))
OWNER_PRIVATE_KEY = os.getenv('OWNER_PRIVATE_KEY', '')
GAS_PRIORITY_GWEI = int(os.getenv('GAS_PRIORITY_GWEI', '1'))

# Tournament (read-only + tx building)
TOURNAMENT_ADDRESS = os.getenv('TOURNAMENT_ADDRESS', '0x0000000000000000000000000000000000000000')
TOURNAMENT_ABI_PATH = os.getenv('TOURNAMENT_ABI_PATH', str(BASE_DIR / 'chain' / 'TournamentQuizV2.abi.json'))

# ✅ FIXED: Read from environment instead of hardcoding
CUSD_ADDRESS = os.getenv('CUSD_ADDRESS', '0xde9e4c3ce781b4ba68120d6261cbad65ce0ab00b')
HOUSE_ADDRESS = os.getenv('HOUSE_ADDRESS', '0x0EdBC6F8506e72478CE78a4AE934C7b21cb7050A')
HOUSE_PK = os.getenv('HOUSE_PK', '')
QUIZ_ENTRY_FEE = float(os.getenv('QUIZ_ENTRY_FEE', '0.01'))