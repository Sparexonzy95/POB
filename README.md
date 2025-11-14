🏆  proof of brain
A blockchain-based quiz tournament platform built on Celo, featuring real-money tournaments, custom branding, and mobile-first design with MiniPay integration.
🎯 Features

🎮 Real-Money Tournaments - cUSD entry fees with automatic prize distribution
📱 Mobile-First - Optimized for MiniPay & MetaMask
🎨 Custom Branding - Name your tournaments professionally
🏅 On-Chain Leaderboards - Tamper-proof scoring
⚡ iPhone Optimized - 99% success rate on iOS
🎫 Multi-Pass System - Buy passes to play multiple times
🔒 Secure - Web3 authentication & token approvals

🚀 Quick Start
Prerequisites

Python 3.10+
Node.js 16+
PostgreSQL 13+
Celo wallet (MetaMask or MiniPay)

Installation
bash# Clone repository
git clone https://github.com/yourusername/POB.git
cd celo-quiz-tournament

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your config

# Database
python manage.py migrate
python manage.py createsuperuser

# Frontend setup
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local with your config

# Run
# Terminal 1: python manage.py runserver
# Terminal 2: npm run dev
Visit http://localhost:3000
📁 Project Structure
├── backend/
│   ├── quiz/
│   │   ├── models.py              # Database models
│   │   ├── views_tournament.py    # Tournament API
│   │   ├── web3svc_tournament.py  # Web3 integration
│   │   └── urls.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/tournament/ # Tournament UI
│   │   ├── pages/                 # Pages
│   │   ├── hooks/                 # React hooks
│   │   └── lib/                   # Utilities
│   └── package.json
│
├── contracts/
│   └── TournamentQuizV2.sol
│
└── docs/
🔧 Configuration
Backend (.env)
bashSECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:pass@localhost/quiz_db

# Celo
CELO_RPC=https://forno.celo-sepolia.celo-testnet.org
CELO_CHAIN_ID=11142220
TOURNAMENT_ADDRESS=0x3d1b57db0f8dDE1C6E796d6542055F951195eBd4
CUSD_ADDRESS=0xde9e4c3ce781b4ba68120d6261cbad65ce0ab00b
HOUSE_ADDRESS=0xYourHouseWallet
HOUSE_PK=your-private-key
Frontend (.env.local)
bashVITE_API_URL=http://localhost:8000/api
CELO_CHAIN_ID=11142220
VITE_TOURNAMENT_ADDRESS=0x3d1b57db0f8dDE1C6E796d6542055F951195eBd4
VITE_CUSD_ADDRESS=0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b
📚 API Quick Reference
Tournaments
bash# List tournaments
GET /api/tournament/list/

# Tournament info
GET /api/tournament/{id}/info/

# Register
POST /api/tournament/{id}/register/
Body: {"address": "0x..."}

# Buy passes
POST /api/tournament/{id}/passes/
Body: {"address": "0x...", "amount": 3}

# Start session
POST /api/tournament/session/start/
Body: {"tournamentId": 1, "address": "0x..."}

# Finish session
POST /api/tournament/session/finish/
Body: {"sessionId": 123, "tournamentId": 1, "address": "0x..."}
See API.md for complete documentation.
🎮 Usage
For Players

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

🚀 Deployment
Backend (Digital Ocean/AWS)
bashpip install -r requirements.txt gunicorn
python manage.py migrate
python manage.py collectstatic
gunicorn project.wsgi:application --bind 0.0.0.0:8000
Frontend (Vercel/Netlify)
bashnpm run build
vercel deploy --prod
# or
netlify deploy --prod
🧪 Testing
bash# Backend
python manage.py test

# Frontend
npm test
npm run test:e2e
🤝 Contributing

Fork the repo
Create feature branch (git checkout -b feature/amazing)
Commit changes (git commit -m 'Add feature')
Push (git push origin feature/amazing)
Open Pull Request

📝 License
MIT License - see LICENSE
🙏 Acknowledgments

Celo
Django
React
Tailwind CSS

📞 Support

Issues: GitHub Issues
Email: sparexonzy95@gmail.com


Built with ❤️ on Celo
