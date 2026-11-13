import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function App() {
  const [address, setAddress] = useState("DemoFraudWallet");
  const [depth, setDepth] = useState(3);
  const [trace, setTrace] = useState(null);
  const [verify, setVerify] = useState(null);
  const [risk, setRisk] = useState(null);
  const [signature, setSignature] = useState("DEMO_VALID_TX");
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [claimedSender, setClaimedSender] = useState("");
  const [claimedReceiver, setClaimedReceiver] = useState("");
  const [claimedAmount, setClaimedAmount] = useState("");

  useEffect(() => {
    if (window.solana && window.solana.isPhantom) {
      window.solana.on("connect", () => {
        setConnectedWallet(window.solana.publicKey.toString());
      });
      window.solana.on("disconnect", () => {
        setConnectedWallet(null);
      });
    }
  }, []);

  async function connectWallet() {
    if (window.solana) {
      try {
        const resp = await window.solana.connect();
        const pubKey = resp.publicKey.toString();
        setConnectedWallet(pubKey);
        setAddress(pubKey);
      } catch (e) {
        alert("Wallet connection rejected: " + e.message);
      }
    } else {
      alert("No Solana browser wallet detected (e.g., Phantom). You can type any Solana public key or use Demo mode!");
    }
  }

  async function analyze() {
    setLoadingTrace(true);
    setTrace(null);
    setRisk(null);
    try {
      const t = await fetch(`${API}/api/trace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, depth: Number(depth) })
      }).then(r => r.json());
      setTrace(t);

      const lastNodeId = t.nodes?.length ? t.nodes[t.nodes.length - 1].id : address;
      const v = await fetch(`${API}/api/attribution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: lastNodeId })
      }).then(r => r.json());

      const r = await fetch(`${API}/api/risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knownVasp: v.found,
          intermediaryCount: Math.max(0, (t.nodes?.length || 1) - 2),
          rapidMovement: true,
          largeTransfer: t.edges?.some(e => e.amount > 3)
        })
      }).then(r => r.json());

      setRisk(r);
    } catch (err) {
      alert("Error performing trace analysis: " + err.message);
    } finally {
      setLoadingTrace(false);
    }
  }

  async function verifyTx() {
    setLoadingVerify(true);
    setVerify(null);
    try {
      const claimed = {};
      if (claimedSender) claimed.sender = claimedSender;
      if (claimedReceiver) claimed.receiver = claimedReceiver;
      if (claimedAmount) claimed.amount = Number(claimedAmount);

      const v = await fetch(`${API}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, claimed: Object.keys(claimed).length ? claimed : null })
      }).then(r => r.json());
      setVerify(v);
    } catch (err) {
      alert("Error verifying transaction: " + err.message);
    } finally {
      setLoadingVerify(false);
    }
  }

  function exportEvidenceReport() {
    if (!trace) return;
    const report = {
      timestamp: new Date().toISOString(),
      targetAddress: address,
      mode: trace.mode || "DEMO",
      trace,
      risk,
      verification: verify
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fraud-attribution-evidence-${address.substring(0, 8)}.json`;
    a.click();
  }

  return (
    <div className="app">
      <header>
        <div>
          <div className="eyebrow">BLOCKCHAIN INTELLIGENCE & FORENSICS</div>
          <h1>Crypto Fraud Attribution</h1>
          <p>On-chain transaction verification, VASP attribution, and fund-flow tracing</p>
        </div>
        <div className="header-actions">
          <div className="badge-mode">
            <span className="badge-dot"></span>
            <span>{trace?.mode === "LIVE_SOLANA_RPC" ? "SOLANA MAINNET RPC" : "HYBRID LIVE/DEMO MODE"}</span>
          </div>
          <button className="btn-wallet" onClick={connectWallet}>
            {connectedWallet
              ? `${connectedWallet.substring(0, 4)}...${connectedWallet.substring(connectedWallet.length - 4)}`
              : "Connect Wallet"}
          </button>
        </div>
      </header>

      <main>
        <div className="main-grid">
          <section className="card">
            <h2>🔍 Investigate Wallet</h2>
            <label>Target Wallet Address or Public Key</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter Solana Wallet Address or Demo address"
            />
            <label>Fund Tracing Depth (Hops)</label>
            <select value={depth} onChange={e => setDepth(e.target.value)}>
              {[1, 2, 3, 4, 5].map(x => (
                <option key={x} value={x}>
                  {x} Hop{x > 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <button className="primary" onClick={analyze} disabled={loadingTrace}>
              {loadingTrace ? "Tracing On-Chain Transfers..." : "Analyze Fund Flow"}
            </button>
            <p className="muted" style={{ marginTop: 12 }}>
              Try demo addresses: <code>DemoFraudWallet</code> or any real Solana mainnet address.
            </p>
          </section>

          <section className="card">
            <h2>⚡ Quick Signature Verification</h2>
            <label>Transaction Signature</label>
            <input
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="Solana Transaction Signature"
            />
            <div className="input-group">
              <div style={{ flex: 1 }}>
                <label>Claimed Sender (Optional)</label>
                <input
                  value={claimedSender}
                  onChange={e => setClaimedSender(e.target.value)}
                  placeholder="Expected Sender"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Claimed Amount (Optional SOL)</label>
                <input
                  value={claimedAmount}
                  onChange={e => setClaimedAmount(e.target.value)}
                  placeholder="Expected Amount"
                />
              </div>
            </div>
            <button className="primary" onClick={verifyTx} disabled={loadingVerify}>
              {loadingVerify ? "Verifying On-Chain..." : "Verify Signature"}
            </button>
            <p className="muted" style={{ marginTop: 12 }}>
              Demo signatures: <code>DEMO_VALID_TX</code>, <code>DEMO_FAILED_TX</code>
            </p>
          </section>
        </div>

        {trace && (
          <section className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>🕸️ Transaction Flow Graph</h2>
              <button className="btn-wallet" style={{ fontSize: 12, padding: "6px 14px" }} onClick={exportEvidenceReport}>
                📥 Export Evidence JSON
              </button>
            </div>
            <div className="graph-container">
              {trace.nodes?.map((n, i) => (
                <React.Fragment key={n.id + i}>
                  <div className={`node-card ${n.type.toLowerCase()}`}>
                    <div className="node-type">{n.type}</div>
                    <div className="node-id">{n.id}</div>
                    {n.entity && <div className="node-entity">🏷️ {n.entity}</div>}
                  </div>
                  {i < trace.nodes.length - 1 && <div className="arrow-divider">➔</div>}
                </React.Fragment>
              ))}
            </div>
            <label style={{ marginTop: 16 }}>Detailed Transfers & Edges</label>
            <pre>{JSON.stringify(trace.edges, null, 2)}</pre>
          </section>
        )}

        {risk && (
          <section className="card">
            <h2>🛡️ Risk & Intelligence Analysis</h2>
            <div className="risk-header">
              <div className="risk-score-display">
                {risk.score}
                <small>/100</small>
              </div>
              <div className={`risk-pill ${risk.category}`}>{risk.category} RISK</div>
            </div>
            <label>Identified Risk Indicators</label>
            <ul className="indicator-list">
              {risk.indicators?.map(x => (
                <li key={x}>⚠️ {x}</li>
              ))}
            </ul>
            <p className="muted">{risk.disclaimer}</p>
          </section>
        )}

        {verify && (
          <section className="card">
            <h2>📋 On-Chain Verification Verdict</h2>
            <div className="verdict-box">
              <span className={`verdict-badge ${verify.verdict}`}>{verify.verdict}</span>
              <pre>{JSON.stringify(verify, null, 2)}</pre>
            </div>
          </section>
        )}
      </main>

      <footer>
        Blockchain data and attribution evidence must be independently verified before investigative use.
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
