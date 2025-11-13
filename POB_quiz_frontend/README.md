# Celo Quiz Frontend (React + Vite + viem)

## 1) Setup
```bash
npm i
cp .env.example .env
# Edit .env:
# VITE_API_BASE=http://localhost:8000/api
# VITE_QUIZ_ADDRESS=0xYourDeployedAddress
# VITE_CELO_RPC=https://forno.celo.org
npm run dev
```
Open http://localhost:5173

## 2) Features
- Shows on-chain state (entry fee, house %, total funds, cUSD)
- Displays your on-chain credits
- **Approve + payEntryFee** (uses your wallet)
- Start a session (backend), answer questions, finish and see score

## 3) Owner panel (optional)
Use `src/components/OwnerPanel.tsx` to test `settleGame` and admin setters if you’d like. Ensure your connected wallet is the contract owner.