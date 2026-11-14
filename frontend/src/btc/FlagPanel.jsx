import React from "react";

function short(a, n = 6) {
  return a.length > n * 2 ? `${a.slice(0, n)}…${a.slice(-n)}` : a;
}

const FLAG_ICONS = {
  RAPID_FORWARDING: "⚡",
  PEEL_CHAIN: "🪢",
  HIGH_FAN_OUT: "🎯"
};

export default function FlagPanel({ flags }) {
  if (!flags?.length) {
    return (
      <section className="card">
        <h2>🛡️ Suspicious-Activity Heuristics</h2>
        <p className="muted">No heuristic flags triggered for this trace window. (Absence of flags is not proof of legitimacy.)</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>🛡️ Suspicious-Activity Heuristics</h2>
      <ul className="indicator-list">
        {flags.map(f => (
          <li key={f.type} className={`flag-item severity-${f.severity.toLowerCase()}`}>
            <strong>
              {FLAG_ICONS[f.type]} {f.type.replace(/_/g, " ")} — {f.severity}
            </strong>
            <div className="muted">{f.detail}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
