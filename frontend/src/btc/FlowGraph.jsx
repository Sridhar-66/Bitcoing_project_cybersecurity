import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

function truncate(a, n = 6) {
  return a.length > n * 2 ? `${a.slice(0, n)}…${a.slice(-n)}` : a;
}

function btcLabel(sats) {
  const btc = sats / 1e8;
  return `${btc >= 0.001 ? btc.toFixed(4) : btc.toFixed(8)} BTC`;
}

export default function FlowGraph({ graph }) {
  const { flowNodes, flowEdges } = useMemo(() => {
    const hops = new Map();
    graph.nodes.forEach(n => hops.set(n.id, n.hop));

    const byHop = new Map();
    for (const n of graph.nodes) {
      if (!byHop.has(n.hop)) byHop.set(n.hop, []);
      byHop.get(n.hop).push(n.id);
    }

    const start = graph.start;
    const isStart = id => id === start;

    const flowNodes = [];
    for (const [hop, ids] of [...byHop.entries()].sort((a, b) => a[0] - b[0])) {
      ids.forEach((id, i) => {
        flowNodes.push({
          id,
          position: { x: hop * 260, y: i * 110 },
          data: { label: truncate(id) + (isStart(id) ? "\n(START)" : "") },
          style: {
            background: isStart(id) ? "rgba(37, 99, 235, 0.08)" : "#ffffff",
            border: isStart(id) ? "1px solid #2563eb" : "1px solid rgba(15, 23, 42, 0.15)",
            borderRadius: 10,
            color: "#0f172a",
            fontSize: 11,
            fontFamily: "JetBrains Mono, monospace",
            padding: 8,
            width: 180,
            whiteSpace: "pre-wrap",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)"
          }
        });
      });
    }

    const flowEdges = graph.edges.map(e => ({
      id: `${e.from}->${e.to}:${e.txid}`,
      source: e.from,
      target: e.to,
      label: btcLabel(e.sats),
      labelStyle: { fontSize: 10, fill: "#64748b" },
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.95 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#2563eb" },
      style: { stroke: e.confirmed ? "#2563eb" : "#d97706", strokeWidth: 1.5 },
      animated: !e.confirmed
    }));

    return { flowNodes, flowEdges };
  }, [graph]);

  return (
    <div className="flow-graph-container">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        proOptions={{ hideAttribution: false }}
        nodesDraggable
        nodesConnectable={false}
      >
        <Background color="#dbe4f0" gap={18} />
        <Controls />
      </ReactFlow>
      <p className="muted flow-legend">
        Blue arrow = confirmed · orange (animated) = mempool · labels = amount per transfer
      </p>
    </div>
  );
}
