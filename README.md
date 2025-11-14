🏆 proof of brain
A blockchain-based quiz tournament platform built on Celo, featuring real-money tournaments, custom branding, and mobile-first design with MiniPay integration.

# Features

🎮 Real-Money Tournaments - cUSD entry
fees with automatic prize distribution

📱 Mobile-First - Optimized for MiniPay & MetaMask

🎨 Custom Branding - Name your tournaments professionally

🏅 On-Chain Leaderboards - Tamper-proof scoring

⚡ iPhone Optimized - 99% success rate on iOS

🎫 Multi-Pass System - Buy passes to play multiple times

🔒 Secure - Web3 authentication & token approvals

# Quick Start

Prerequisites

Python 3.10+

Node.js 16+

Solidity

Celo wallet (MetaMask or MiniPay)

Installation

Clone repository
git clone https://github.com/yourusername/POB.git

cd POB

# Backend setup

cd POB_quiz_backend

python -m venv venv

source venv/bin/activate

pip install -r requirements.txt

Edit .env with your config

# Database
python manage.py migrate

python manage.py createsuperuser

# Frontend setup

cd ../frontend

npm install

Edit .env with your config

# Run

Terminal 1: python manage.py runserver

Terminal 2: npm run dev

Visit http://localhost:3000


Connect wallet

Browse tournaments

Register & pay entry fee

Buy passes (optional)

Play quiz

View leaderboard

For Admins

Create tournament (Admin tab)

Set custom name

Players register & play

Settle after tournament ends

# Deployment

Backend (Digital Ocean/AWS)

bashpip install -r requirements.txt 

gunicorn

python manage.py migrate

python manage.py collectstatic

gunicorn project.wsgi:application --
bind 0.0.0.0:8000

Frontend (Vercel/Netlify)

bashnpm run build

vercel deploy --prod

 or
 
netlify deploy --prod



📝 License
MIT License - see LICENSE
🙏 Acknowledgments

minipay

solidarity 

Django

React

Tailwind CSS


📞 Support

Issues: GitHub Issues

Email: sparexonzy95@gmail.com


Built with ❤️ on Celo
