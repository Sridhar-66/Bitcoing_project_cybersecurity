import React, { useState } from "react";
import HistoryTable from "./HistoryTable.jsx";
import FlowGraph from "./FlowGraph.jsx";
import FlagPanel from "./FlagPanel.jsx";

const API = import.meta.env.VITE_API_URL || "";

const NETWORKS = [
  { id: "testnet4", label: "Testnet 4" },
  { id: "main", label: "Mainnet" }
];

function shortAddr(a, n = 8) {
  return a.length > n * 2 ? `${a.slice(0, n)}…${a.slice(-n)}` : a;
}

export default function BitcoinView() {
  const [network, setNetwork] = useState("testnet4");
  const [query, setQuery] = useState("");
  const [hops, setHops] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [graph, setGraph] = useState(null);

  async function search() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setLedger(null);
    setGraph(null);
    try {
      const [lk, tr] = await Promise.all([
        fetch(`${API}/api/btc/lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ network, query })
        }).then(r => r.json()),
        fetch(`${API}/api/btc/trace`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ network, query, hops: Number(hops) })
        }).then(r => r.json())
      ]);
      if (lk.error) throw new Error(lk.error);
      if (tr.error) throw new Error(tr.error);
      setLedger(lk);
      setGraph(tr);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <div>
          <div className="eyebrow">BITCOIN TRANSACTION TRACKER</div>
          <h1>Fund-Flow Analyzer</h1>
          <p>UTXO ledger history, multi-hop tracing, and suspicious-activity flags</p>
        </div>
        <div className="badge-mode">
          <span className="badge-dot"></span>
          <span>{network === "main" ? "BITCOIN MAINNET" : "TESTNET 4"}</span>
        </div>
      </header>

      <main>
        <section className="card">
          <h2>🔍 Lookup Address or Transaction ID</h2>
          <label>Network</label>
          <div className="network-toggle">
            {NETWORKS.map(n => (
              <button
                key={n.id}
                className={`net-btn ${network === n.id ? "active" : ""}`}
                onClick={() => setNetwork(n.id)}
              >
                {n.label}
              </button>
            ))}
          </div>
          <label>Wallet Address or TXID</label>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="tb1q… / bc1q… / 64-char transaction id"
          />
          <label>Fund-Flow Tracing Depth (Hops)</label>
          <select value={hops} onChange={e => setHops(e.target.value)}>
            {[1, 2, 3, 4, 5].map(x => (
              <option key={x} value={x}>{x} Hop{x > 1 ? "s" : ""}</option>
            ))}
          </select>
          <button className="primary" onClick={search} disabled={loading}>
            {loading ? "Tracing On-Chain..." : "Analyze"}
          </button>
        </section>

        {error && (
          <section className="card error-card">⚠️ {error}</section>
        )}

        {ledger && <HistoryTable network={network} ledger={ledger} />}

        {graph && graph.edges.length > 0 && (
          <section className="card">
            <h2>🕸️ Multi-Hop Fund-Flow Graph</h2>
            <p className="muted">
              {graph.nodes.length} wallets · {graph.edges.length} transfers ·
              start: <code>{shortAddr(graph.start)}</code>
            </p>
            <FlowGraph graph={graph} />
          </section>
        )}

        {graph && <FlagPanel flags={graph.flags} />}
      </main>

      <footer>
        Data: mempool.space public API · Bitcoin blockchain analysis must be independently verified.
      </footer>
    </div>
  );
}
