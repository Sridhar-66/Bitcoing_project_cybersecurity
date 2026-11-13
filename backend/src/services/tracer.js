import { lookupVasp } from "./attribution.js";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
let connection = null;

function getSolanaConnection(Connection) {
  if (!connection) {
    connection = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return connection;
}

const graph = {
  "DemoFraudWallet": [
    { to: "IntermediaryA", amount: 4.8, asset: "SOL", tx: "DEMO_TX_A" }
  ],
  "IntermediaryA": [
    { to: "IntermediaryB", amount: 4.7, asset: "SOL", tx: "DEMO_TX_B" }
  ],
  "IntermediaryB": [
    { to: "DemoExchangeDeposit", amount: 4.6, asset: "SOL", tx: "DEMO_TX_C" }
  ]
};

export async function traceWallet({ address, depth = 3 }) {
  if (!address) throw new Error("Wallet address is required");
  const maxDepth = Math.min(5, Math.max(1, Number(depth)));

  // Demo address check
  if (graph[address] || address.startsWith("Demo")) {
    const nodes = [{ id: address, type: "WALLET" }];
    const edges = [];
    const seen = new Set([address]);
    let frontier = [address];

    for (let level = 0; level < maxDepth; level++) {
      const next = [];
      for (const from of frontier) {
        for (const transfer of graph[from] || []) {
          if (!seen.has(transfer.to)) {
            seen.add(transfer.to);
            const vaspMatch = lookupVasp({ address: transfer.to });
            nodes.push({
              id: transfer.to,
              type: vaspMatch.found ? "VASP" : (transfer.to.includes("Exchange") ? "VASP" : "WALLET"),
              entity: vaspMatch.found ? vaspMatch.attribution.entity : null
            });
            next.push(transfer.to);
          }
          edges.push({ from, to: transfer.to, ...transfer });
        }
      }
      frontier = next;
    }

    return { address, depth: maxDepth, nodes, edges, mode: "DEMO" };
  }

  // Live Solana RPC address tracing
  try {
    const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
    const pubKey = new PublicKey(address);
    const conn = getSolanaConnection(Connection);
    const nodes = [{ id: address, type: "WALLET" }];
    const edges = [];
    const seen = new Set([address]);
    let frontier = [address];

    for (let level = 0; level < maxDepth; level++) {
      const next = [];
      for (const currentAddress of frontier) {
        try {
          const currentPubKey = new PublicKey(currentAddress);
          const sigs = await conn.getSignaturesForAddress(currentPubKey, { limit: 5 });
          
          for (const sigInfo of sigs) {
            const parsedTx = await conn.getParsedTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0
            });
            if (!parsedTx || parsedTx.meta?.err) continue;

            const accountKeys = parsedTx.transaction.message.accountKeys;
            const recipient = accountKeys.find(a => a.pubkey.toBase58() !== currentAddress)?.pubkey?.toBase58();
            
            if (recipient && !seen.has(recipient)) {
              seen.add(recipient);
              
              let amountTransferred = 0;
              if (parsedTx.meta?.preBalances && parsedTx.meta?.postBalances) {
                const diff = Math.abs(parsedTx.meta.preBalances[0] - parsedTx.meta.postBalances[0]);
                amountTransferred = diff / LAMPORTS_PER_SOL;
              }

              const vaspMatch = lookupVasp({ address: recipient });
              nodes.push({
                id: recipient,
                type: vaspMatch.found ? "VASP" : "WALLET",
                entity: vaspMatch.found ? vaspMatch.attribution.entity : null
              });

              edges.push({
                from: currentAddress,
                to: recipient,
                amount: amountTransferred || 0.1,
                asset: "SOL",
                tx: sigInfo.signature.substring(0, 8) + "..."
              });

              next.push(recipient);
            }
          }
        } catch (e) {
          console.warn(`Failed to trace node ${currentAddress}:`, e.message);
        }
      }
      frontier = next;
    }

    return { address, depth: maxDepth, nodes, edges, mode: "LIVE_SOLANA_RPC" };
  } catch (err) {
    // If not a valid Solana public key, fall back to mock nodes representation
    return {
      address,
      depth: maxDepth,
      nodes: [
        { id: address, type: "WALLET" },
        { id: `${address}_Intermediary_1`, type: "WALLET" },
        { id: "DemoExchangeDeposit", type: "VASP", entity: "Demo Exchange" }
      ],
      edges: [
        { from: address, to: `${address}_Intermediary_1`, amount: 2.5, asset: "SOL", tx: "TX_SIM_1" },
        { from: `${address}_Intermediary_1`, to: "DemoExchangeDeposit", amount: 2.45, asset: "SOL", tx: "TX_SIM_2" }
      ],
      mode: "SIMULATED_RPC_FALLBACK",
      note: "Invalid Base58 key or RPC rate limit; rendered simulated flow."
    };
  }
}

