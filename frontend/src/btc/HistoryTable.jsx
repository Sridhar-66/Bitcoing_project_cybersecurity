import React from "react";

export function satsToBtc(sats) {
  return (sats / 1e8).toFixed(8).replace(/\.?0+$/, "") || "0";
}

function short(a, n = 6) {
  return a.length > n * 2 ? `${a.slice(0, n)}…${a.slice(-n)}` : a;
}

function time(t) {
  if (!t) return "unconfirmed";
  return new Date(t).toLocaleString();
}

export default function HistoryTable({ ledger }) {
  if (ledger.kind === "tx") {
    const tx = ledger.tx;
    return (
      <section className="card">
        <h2>🧾 Transaction Detail</h2>
        <p className="muted"><code>{tx.txid}</code></p>
        <div className="tx-meta">
          <span>Status: {tx.confirmed ? "✅ Confirmed" : "⏳ Mempool"}</span>
          <span>Fee: {satsToBtc(tx.feeSats)} BTC</span>
          <span>Time: {time(tx.blockTime)}</span>
        </div>
        <label>Inputs (senders)</label>
        <table className="ledger-table">
          <thead><tr><th>Address</th><th>Amount</th></tr></thead>
          <tbody>
            {tx.inputs.map((v, i) => (
              <tr key={i}>
                <td><code>{short(v.address, 10)}</code></td>
                <td>{satsToBtc(v.sats)} BTC</td>
              </tr>
            ))}
          </tbody>
        </table>
        <label>Outputs (recipients)</label>
        <table className="ledger-table">
          <thead><tr><th>Address</th><th>Amount</th></tr></thead>
          <tbody>
            {tx.outputs.map((v, i) => (
              <tr key={i}>
                <td><code>{short(v.address, 10)}</code></td>
                <td>{satsToBtc(v.sats)} BTC</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  const { address, totals, entries } = ledger;

  return (
    <section className="card">
      <h2>🧾 Transaction History</h2>
      <p className="muted"><code>{address}</code></p>
      <div className="tx-meta">
        <span>Transactions: {totals?.txCount ?? "—"}</span>
        <span>Total received: {satsToBtc(totals?.receivedSats || 0)} BTC</span>
        <span>Total sent: {satsToBtc(totals?.sentSats || 0)} BTC</span>
      </div>
      {entries.length === 0 ? (
        <p className="muted">No transactions found for this address yet. Try a Testnet4 address with activity (see faucet guide).</p>
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Time</th><th>Dir</th><th>Amount</th><th>Fee</th><th>Counterparty</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.txid + e.direction}>
                <td>{time(e.blockTime)}</td>
                <td className={e.direction === "SENT" ? "dir-sent" : "dir-received"}>
                  {e.direction === "SENT" ? "▲ SENT" : "▼ RCVD"}
                </td>
                <td>{satsToBtc(e.amountSats)} BTC</td>
                <td>{satsToBtc(e.feeSats)} BTC</td>
                <td>
                  {e.counterparties.length
                    ? e.counterparties.map(c => <code key={c} style={{ display: "block" }}>{short(c, 8)}</code>)
                    : "—"}
                </td>
                <td>{e.confirmed ? "✅" : "⏳ mempool"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
