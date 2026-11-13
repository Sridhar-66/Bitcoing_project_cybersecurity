# Crypto Fraud Attribution & Blockchain Intelligence

A no-login, wallet-first prototype for authorized crypto-fraud investigation.

## Features
- Wallet connection via browser wallet
- Solana transaction verification
- Depth-limited fund-flow tracing
- Transaction graph
- Demo VASP attribution registry
- Explainable risk scoring
- Investigation/evidence hash generation
- No passwords, signup, or traditional user accounts

## Architecture
Frontend: React + Vite
Backend: Node.js + Express
On-chain program: Anchor/Solana starter
Demo mode works without external API keys.

## Run
### Backend
cd backend
npm install
npm run dev

### Frontend
cd frontend
npm install
npm run dev

Set `VITE_API_URL` if the backend is not on http://localhost:4000.

## Important
This repository contains synthetic/demo attribution data. It must not be treated as real VASP intelligence.
