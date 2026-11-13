import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
let connection = null;

function getSolanaConnection() {
  if (!connection) {
    connection = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return connection;
}

const demo = {
  "DEMO_VALID_TX": {
    exists: true, status: "SUCCESS", sender: "DemoSender111",
    receiver: "DemoReceiver222", amount: 5, asset: "SOL",
    timestamp: "2026-08-28T09:30:00Z"
  },
  "DEMO_FAILED_TX": {
    exists: true, status: "FAILED", sender: "DemoSender111",
    receiver: "DemoReceiver222", amount: 5, asset: "SOL",
    timestamp: "2026-08-28T09:35:00Z"
  }
};

export async function verifyTransaction({ signature, claimed }) {
  if (!signature) throw new Error("Transaction signature is required");

  // Check demo records first
  if (demo[signature]) {
    const tx = demo[signature];
    const mismatches = [];
    if (claimed?.sender && claimed.sender !== tx.sender) mismatches.push("sender");
    if (claimed?.receiver && claimed.receiver !== tx.receiver) mismatches.push("receiver");
    if (claimed?.amount != null && Number(claimed.amount) !== tx.amount) mismatches.push("amount");
    if (claimed?.asset && claimed.asset !== tx.asset) mismatches.push("asset");

    return {
      signature,
      mode: "DEMO",
      ...tx,
      verdict: tx.status !== "SUCCESS" ? "FAILED_ON_CHAIN" :
        mismatches.length ? "CLAIM_MISMATCH" : "VERIFIED",
      mismatches
    };
  }

  // Live Solana RPC lookup
  try {
    const conn = getSolanaConnection();
    const parsedTx = await conn.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!parsedTx) {
      return {
        signature,
        status: "NOT_FOUND",
        verdict: "NO_MATCHING_ON_CHAIN_RECORD",
        mode: "LIVE_SOLANA_RPC"
      };
    }

    const isError = parsedTx.meta?.err !== null;
    const accountKeys = parsedTx.transaction.message.accountKeys;
    const sender = accountKeys[0]?.pubkey?.toBase58() || "Unknown";
    const receiver = accountKeys[1]?.pubkey?.toBase58() || "Unknown";
    
    // Estimate SOL amount transferred from pre and post balances
    let amountTransferred = 0;
    if (parsedTx.meta?.preBalances && parsedTx.meta?.postBalances) {
      const diff = (parsedTx.meta.preBalances[0] - parsedTx.meta.postBalances[0]) - (parsedTx.meta.fee || 0);
      amountTransferred = Math.max(0, diff / LAMPORTS_PER_SOL);
    }

    const txTime = parsedTx.blockTime
      ? new Date(parsedTx.blockTime * 1000).toISOString()
      : new Date().toISOString();

    const txData = {
      exists: true,
      status: isError ? "FAILED" : "SUCCESS",
      sender,
      receiver,
      amount: amountTransferred,
      asset: "SOL",
      timestamp: txTime,
      slot: parsedTx.slot,
      fee: (parsedTx.meta?.fee || 0) / LAMPORTS_PER_SOL
    };

    const mismatches = [];
    if (claimed?.sender && claimed.sender !== txData.sender) mismatches.push("sender");
    if (claimed?.receiver && claimed.receiver !== txData.receiver) mismatches.push("receiver");
    if (claimed?.amount != null && Math.abs(Number(claimed.amount) - txData.amount) > 0.001) mismatches.push("amount");
    if (claimed?.asset && claimed.asset !== txData.asset) mismatches.push("asset");

    return {
      signature,
      mode: "LIVE_SOLANA_RPC",
      ...txData,
      verdict: isError ? "FAILED_ON_CHAIN" : mismatches.length ? "CLAIM_MISMATCH" : "VERIFIED",
      mismatches
    };
  } catch (err) {
    return {
      signature,
      status: "ERROR",
      verdict: "RPC_LOOKUP_FAILED",
      error: err.message,
      mode: "LIVE_SOLANA_RPC"
    };
  }
}

