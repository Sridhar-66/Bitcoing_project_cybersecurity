import { mempoolGet, isSupportedNetwork } from "./mempoolClient.js";
import { analyze } from "./riskHeuristics.js";

const NODE_CAP = 50;
const ADDRESS_FETCH_DELAY_MS = 120;
const SATS_PER_BTC = 100_000_000;

export function isTxid(query) {
  return /^[0-9a-f]{64}$/i.test(query.trim());
}

function distinctAddresses(list) {
  return [...new Set(list.filter(Boolean))];
}

function txInputAddresses(tx, exclude) {
  return distinctAddresses(
    (tx.vin || [])
      .map(v => v.prevout?.scriptpubkey_address)
      .filter(a => a && a !== exclude)
  );
}

function txOutputAddresses(tx, { exclude, excludeChangeTo }) {
  const changeSet = excludeChangeTo ? new Set(txInputAddresses(tx, null).concat(exclude ? [exclude] : [])) : new Set(exclude ? [exclude] : []);
  return distinctAddresses(
    (tx.vout || [])
      .map(v => v.scriptpubkey_address)
      .filter(a => a && !changeSet.has(a))
  );
}

function outputValueTo(tx, address) {
  return (tx.vout || [])
    .filter(v => v.scriptpubkey_address === address)
    .reduce((sum, v) => sum + (v.value || 0), 0);
}

function txTimestamp(tx) {
  if (tx.status?.confirmed && tx.status?.block_time) return tx.status.block_time * 1000;
  if (tx.block_time) return tx.block_time * 1000;
  return null;
}

async function addressTransactions(network, address) {
  const [mempoolTxs, chainTxs] = await Promise.all([
    mempoolGet(network, `/address/${address}/txs/mempool`),
    mempoolGet(network, `/address/${address}/txs/chain`)
  ]);
  return [...mempoolTxs, ...chainTxs];
}

export async function lookup(network, query) {
  if (!isSupportedNetwork(network)) throw new Error("Unknown network (use main, testnet4 or testnet3)");
  const q = query.trim();
  if (!q) throw new Error("Address or transaction id is required");

  if (isTxid(q)) {
    const tx = await mempoolGet(network, `/tx/${q}`);
    return {
      kind: "tx",
      network,
      tx: {
        txid: tx.txid,
        feeSats: tx.fee,
        confirmed: Boolean(tx.status?.confirmed),
        blockTime: txTimestamp(tx),
        inputs: (tx.vin || [])
          .filter(v => v.prevout?.scriptpubkey_address)
          .map(v => ({ address: v.prevout.scriptpubkey_address, sats: v.prevout.value })),
        outputs: (tx.vout || [])
          .filter(v => v.scriptpubkey_address)
          .map(v => ({ address: v.scriptpubkey_address, sats: v.value }))
      }
    };
  }

  const [summary, txs] = await Promise.all([
    mempoolGet(network, `/address/${q}`),
    addressTransactions(network, q)
  ]);

  const entries = txs
    .map(tx => {
      const sentSats = (tx.vin || [])
        .filter(v => v.prevout?.scriptpubkey_address === q)
        .reduce((sum, v) => sum + (v.prevout.value || 0), 0);
      const receivedSats = (tx.vout || [])
        .filter(v => v.scriptpubkey_address === q)
        .reduce((sum, v) => sum + (v.value || 0), 0);

      const inputAddrs = distinctAddresses((tx.vin || []).map(v => v.prevout?.scriptpubkey_address).filter(Boolean));
      const changeBack = Math.min(sentSats, receivedSats) > 0 && receivedSats > 0
        ? (tx.vout || []).filter(v => v.scriptpubkey_address === q).reduce((s, v) => s + v.value, 0)
        : 0;
      const isSender = sentSats > 0;
      const counterparties = isSender
        ? txOutputAddresses(tx, { exclude: q, excludeChangeTo: true })
        : txInputAddresses(tx, q);

      return {
        txid: tx.txid,
        direction: isSender ? "SENT" : "RECEIVED",
        amountSats: isSender ? Math.max(0, sentSats - changeBack) : receivedSats,
        feeSats: tx.fee,
        confirmed: Boolean(tx.status?.confirmed),
        blockTime: txTimestamp(tx),
        counterparties: counterparties.slice(0, 4)
      };
    })
    .sort((a, b) => (b.blockTime || Infinity) - (a.blockTime || Infinity));

  return {
    kind: "address",
    network,
    address: q,
    totals: {
      receivedSats: summary.chain_stats?.funded_txo_sum + (summary.mempool_stats?.funded_txo_sum || 0),
      sentSats: summary.chain_stats?.spent_txo_sum + (summary.mempool_stats?.spent_txo_sum || 0),
      txCount: summary.chain_stats?.tx_count + (summary.mempool_stats?.tx_count || 0)
    },
    entries
  };
}

async function expandAddress(network, address, hop, maxHops, nodes, edges, pending, visited) {
  const txs = await addressTransactions(network, address);

  for (const tx of txs) {
    const time = txTimestamp(tx);
    const involvedAsInput = (tx.vin || []).some(v => v.prevout?.scriptpubkey_address === address);
    const involvedAsOutput = (tx.vout || []).some(v => v.scriptpubkey_address === address);

    if (involvedAsOutput) {
      for (const src of txInputAddresses(tx, address)) {
        const sats = outputValueTo(tx, address);
        addEdge(edges, { from: src, to: address, sats, txid: tx.txid, time, confirmed: Boolean(tx.status?.confirmed) });
        ensureNode(nodes, src, hop + 1, pending, visited, maxHops);
      }
    }

    if (involvedAsInput) {
      for (const dest of txOutputAddresses(tx, { exclude: address, excludeChangeTo: true })) {
        addEdge(edges, { from: address, to: dest, sats: outputValueTo(tx, dest), txid: tx.txid, time, confirmed: Boolean(tx.status?.confirmed) });
        ensureNode(nodes, dest, hop + 1, pending, visited, maxHops);
      }
    }
  }
}

function ensureNode(nodes, address, hop, pending, visited, maxHops) {
  if (nodes.has(address)) {
    if (hop < nodes.get(address).hop) nodes.get(address).hop = hop;
    return;
  }
  if (nodes.size >= NODE_CAP) return;
  nodes.set(address, { id: address, hop });
  if (hop < maxHops && !visited.has(address)) {
    visited.add(address);
    pending.push({ address, hop });
  }
}

const edgeKey = e => `${e.from}->${e.to}:${e.txid}`;

function addEdge(edges, edge) {
  const key = edgeKey(edge);
  if (!edges.has(key)) edges.set(key, edge);
}

export async function trace(network, query, hops) {
  if (!isSupportedNetwork(network)) throw new Error("Unknown network (use main, testnet4 or testnet3)");
  const q = query.trim();
  if (!q) throw new Error("Address or transaction id is required");
  const maxHops = Math.min(5, Math.max(1, Number(hops) || 3));

  const nodes = new Map();
  const edges = new Map();
  const pending = [];
  const visited = new Set();

  if (isTxid(q)) {
    const tx = await mempoolGet(network, `/tx/${q}`);
    const time = txTimestamp(tx);
    const inputAddrs = distinctAddresses((tx.vin || []).map(v => v.prevout?.scriptpubkey_address).filter(Boolean));
    const outputAddrs = distinctAddresses((tx.vout || []).map(v => v.scriptpubkey_address).filter(Boolean));

    for (const src of inputAddrs) {
      ensureNode(nodes, src, 0, pending, visited, maxHops);
      for (const dest of outputAddrs) {
        addEdge(edges, {
          from: src,
          to: dest,
          sats: outputValueTo(tx, dest),
          txid: tx.txid,
          time,
          confirmed: Boolean(tx.status?.confirmed)
        });
      }
    }
    for (const dest of outputAddrs) ensureNode(nodes, dest, 1, pending, visited, maxHops);
  } else {
    nodes.set(q, { id: q, hop: 0 });
    visited.add(q);
    pending.push({ address: q, hop: 0 });
  }

  let lastFetch = 0;
  while (pending.length && nodes.size < NODE_CAP) {
    const { address, hop } = pending.shift();
    const now = Date.now();
    if (now - lastFetch < ADDRESS_FETCH_DELAY_MS) await sleep(ADDRESS_FETCH_DELAY_MS - (now - lastFetch));
    lastFetch = Date.now();
    await expandAddress(network, address, hop, maxHops, nodes, edges, pending, visited);
  }

  const graph = {
    network,
    start: q,
    maxHops,
    nodes: [...nodes.values()].sort((a, b) => a.hop - b.hop),
    edges: [...edges.values()]
  };

  graph.flags = analyze(graph);
  return graph;
}

export function satsToBtc(sats) {
  return sats / SATS_PER_BTC;
}
