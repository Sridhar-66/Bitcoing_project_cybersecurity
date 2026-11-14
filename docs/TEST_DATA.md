# Test Data — Copy & Paste Pack

Paste these into the app (https://bitcoingprojectcybersecurity.vercel.app) to verify every feature works.
Each item was verified against the live APIs. ✅ = known-good, ❌ = error-handling test.

---

## ₿ BITCOIN TRACKER tab

### Testnet 4 (safe, free coins)

| # | Purpose | Network | Value to paste | Expected result |
|---|---------|---------|----------------|-----------------|
| 1 | ✅ Ledger history (rich data) | Testnet 4 | `tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q` | History table with hundreds of SENT/RCVD rows (this is the mempool faucet wallet) |
| 2 | ✅ TXID detail view | Testnet 4 | `b3655bcbd229dd0b339e51e22a5c16c302ed2613f155512639ac80f60a887fc1` | Transaction Detail card: inputs/outputs + fee |
| 3 | ✅ Multi-hop graph | Testnet 4 | `tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q` (depth: 1–2 hops) | Flow graph: faucet → user wallets with amounts on arrows |
| 4 | ❌ Invalid input | Testnet 4 | `rr` | Friendly error: "Please enter a valid Bitcoin address… or 64-character TXID" |
| 5 | ✅ Your own test coins | Testnet 4 | your `tb1q…` address after claiming from the faucet | Your own sends/receives (see docs/TESTNET_GUIDE.md) |

Faucet (free tBTC): https://mempool.space/testnet4/faucet · Explorer: https://mempool.space/testnet4

### Mainnet (real blockchain, read-only analysis)

| # | Purpose | Network | Value to paste | Expected result |
|---|---------|---------|----------------|-----------------|
| 6 | ✅ Genesis-block address (Satoshi) | Mainnet | `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa` | Thousands of ledger entries; graph fills fast (use 1 hop) |
| 7 | ✅ Recent confirmed TXID | Mainnet | `346c04a6e88b691a67d41eff59a46ef8b6f04394a8c98e060a4242ecda8bc18e` | Transaction Detail: input → Satoshi address + bc1q… recipient |
| 8 | ✅ Exchange cold wallet (fan-out test) | Mainnet | `34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo` | Binance cold wallet — good for HIGH_FAN_OUT heuristics (1 hop, may take ~30s) |

---

## ◎ SOLANA FRAUD ATTRIBUTION tab

| # | Purpose | Field | Value to paste | Expected result |
|---|---------|-------|----------------|-----------------|
| 9 | ✅ Demo trace | Target Wallet Address | `DemoFraudWallet` | 3-node flow graph + risk score (demo data) |
| 10 | ✅ Valid demo tx | Transaction Signature | `DEMO_VALID_TX` | Verdict: VERIFIED |
| 11 | ✅ Failed demo tx | Transaction Signature | `DEMO_FAILED_TX` | Verdict: FAILED_ON_CHAIN |
| 12 | ✅ VASP attribution | Target Wallet Address | `DemoFraudWallet` (runs automatically after trace) | Risk panel shows known-VASP attribution |
| 13 | ✅ Live Solana trace | Target Wallet Address | any real mainnet pubkey, e.g. `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` | LIVE_SOLANA_RPC mode trace |

---

## Direct API tests (optional, curl)

```bash
# Bitcoin lookup (ledger)
curl -s -X POST https://bitcoingprojectcybersecurity.vercel.app/api/btc/lookup \
  -H "Content-Type: application/json" \
  -d '{"network":"testnet4","query":"tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q"}'

# Bitcoin multi-hop trace (graph + heuristic flags)
curl -s -X POST https://bitcoingprojectcybersecurity.vercel.app/api/btc/trace \
  -H "Content-Type: application/json" \
  -d '{"network":"testnet4","query":"tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q","hops":2}'

# Bitcoin health
curl -s https://bitcoingprojectcybersecurity.vercel.app/api/health

# Solana demo trace
curl -s -X POST https://bitcoingprojectcybersecurity.vercel.app/api/trace \
  -H "Content-Type: application/json" \
  -d '{"address":"DemoFraudWallet","depth":3}'
```

## What "working" looks like

- **Ledger view**: chronological table, ▲ SENT / ▼ RCVD rows, BTC amounts, fees, ✅ confirmed / ⏳ mempool status.
- **Graph view**: nodes are wallets, arrows show direction, labels show BTC amounts; orange animated edges = unconfirmed.
- **Flags**: RAPID_FORWARDING / PEEL_CHAIN / HIGH_FAN_OUT cards appear when the traced window contains those patterns.
- **Cross-check**: every txid/amount shown can be verified on mempool.space (same public API the app uses).
