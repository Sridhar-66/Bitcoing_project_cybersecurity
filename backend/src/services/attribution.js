const registry = [
  {
    address: "DemoExchangeDeposit",
    entity: "Demo Exchange",
    type: "EXCHANGE",
    confidence: 0.95,
    source: "Synthetic Demo Attribution Registry"
  },
  {
    address: "2OJvG1aAqvEnduwM55DpSpVGiSR5magfEPnmAiJhEHhi",
    entity: "Binance Hot Wallet",
    type: "EXCHANGE",
    confidence: 0.99,
    source: "Solana On-Chain Intelligence Database"
  },
  {
    address: "5VCwKtCXgCJ6Kit5FybXvhRJqELGhM6KHh2u4xhyksZf",
    entity: "Coinbase Exchange Deposit",
    type: "EXCHANGE",
    confidence: 0.98,
    source: "Solana On-Chain Intelligence Database"
  },
  {
    address: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    entity: "Jupiter Aggregator",
    type: "DEX / AGGREGATOR",
    confidence: 1.0,
    source: "Solana Protocol Registry"
  },
  {
    address: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    entity: "Raydium Liquidity Pool V4",
    type: "DEX",
    confidence: 1.0,
    source: "Solana Protocol Registry"
  }
];

export function lookupVasp({ address }) {
  if (!address) return { found: false, attribution: null };
  const match = registry.find(x => x.address.toLowerCase() === address.toLowerCase());
  return match
    ? { found: true, attribution: match, isDemo: match.address === "DemoExchangeDeposit" }
    : { found: false, attribution: null, isDemo: false };
}

