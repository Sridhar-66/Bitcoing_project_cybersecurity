# Bitcoin Testnet4 Verification Guide

End-to-end test of the Fund-Flow Analyzer using free test coins (tBTC) before Mainnet use.

Live app: https://bitcoingprojectcybersecurity.vercel.app (select the "₿ Bitcoin Tracker" tab, network = **Testnet 4**).

## 1. Set up a free Testnet wallet

**Option A — Sparrow Wallet (recommended, desktop):**
1. Download from https://sparrowwallet.com
2. `File → New Wallet` → name it → `Apply → Create New Wallet or Import Wallet → OK` (software wallet).
3. Enable Testnet: `Tools → Restart → Network: Testnet4` (Sparrow connects to public testnet servers; no paid keys needed).
4. Open the `Receive` tab → copy your `tb1q...` address.

**Option B — Electrum:**
1. Download from https://electrum.org
2. Run in testnet mode: `electrum --testnet4` (Linux/macOS) or create a shortcut with that flag on Windows.
3. Create wallet → `Addresses` tab → copy a `tb1q...` address.

## 2. Get free test coins (tBTC)

1. Go to the mempool Testnet4 faucet: https://mempool.space/testnet4/faucet
2. Paste your wallet address, request coins (amounts are small, e.g. < 1 tBTC).
3. Also available: https://coinfaucet.eu/en/btc-testnet
4. Wait ~10–20 minutes (a block must confirm) — check your address on https://mempool.space/testnet4/address/<your-address>

## 3. Make a multi-hop transfer between your own wallets

To trace 2+ hops you need at least 2 receiving addresses (add a second receive address in the same wallet, or a second wallet):

1. Wallet A (funded by faucet) → send e.g. `0.3 tBTC` to address B.
2. From B → send e.g. `0.25 tBTC` to address C (leave some for fee).
3. Note the TXID shown by the wallet after each send.

## 4. Verify the app traces it

1. Open the app, **Testnet 4** selected.
2. Paste **address A** → `Analyze`:
   - History table shows the faucet deposit (▼ RCVD) and your send (▲ SENT) with counterparty B.
   - Flow graph shows A → B.
3. Paste the **TXID of step 1** → `Analyze`:
   - Transaction detail shows inputs/outputs and the fee.
4. Paste **address B** with **2 hops** → `Analyze`:
   - Graph should show A → B → C (forward tracing) and A's funding source (backward tracing).
5. Cross-check every amount/txid on https://mempool.space/testnet4 — the app uses the exact same public API.

## 5. Quick no-wallet verification (no setup needed)

Paste any of these already-active testnet4 items into the app:

- Faucet wallet: `tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q` (thousands of txs, ledger + graph view)
- Any recent testnet4 TXID from https://mempool.space/testnet4/blocks (tap a block → tap a tx)

## Notes

- Same parser works unchanged on Mainnet: toggle to **Mainnet** and use any real `bc1q...` address or TXID.
- Heuristic flags (rapid forwarding, peel chain, fan-out) appear under "Suspicious-Activity Heuristics" when the traced window contains those patterns; a clean result is not proof of legitimacy.
- Backend caches upstream responses (5 min TTL) and retries with backoff on rate limits, so repeated analyses don't hammer mempool.space.
