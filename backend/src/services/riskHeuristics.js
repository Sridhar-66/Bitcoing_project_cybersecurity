const RAPID_FORWARD_MS = 30 * 60 * 1000;
const PEEL_CHAIN_MIN_HOPS = 3;
const FAN_OUT_MIN_EDGES = 5;
const PEEL_DROP_RATIO_MIN = 0.5;
const PEEL_DROP_RATIO_MAX = 0.95;

function buildAdjacency(edges) {
  const out = new Map();
  const inc = new Map();
  for (const e of edges) {
    if (!out.has(e.from)) out.set(e.from, []);
    out.get(e.from).push(e);
    if (!inc.has(e.to)) inc.set(e.to, []);
    inc.get(e.to).push(e);
  }
  for (const list of out.values()) list.sort((a, b) => (a.time || 0) - (b.time || 0));
  return { out, inc };
}

function findRapidForwards(edges) {
  const { out } = buildAdjacency(edges);
  const hops = [];
  for (const [from, outgoing] of out) {
    for (const e1 of outgoing) {
      for (const e2 of out.get(e1.to) || []) {
        if (e1.time && e2.time && e2.time >= e1.time && e2.time - e1.time < RAPID_FORWARD_MS) {
          hops.push({ through: e1.to, txid: e2.txid, deltaMinutes: Math.round((e2.time - e1.time) / 60000) });
        }
      }
    }
  }
  return hops;
}

function findPeelChains(edges) {
  const { out, inc } = buildAdjacency(edges);
  const chains = [];
  const visitedEdges = new Set();

  const starts = [...out.keys()].filter(addr => (inc.get(addr) || []).length === 0 || (inc.get(addr) || []).length > 1);

  for (const start of starts) {
    for (const first of out.get(start) || []) {
      const chain = [start];
      let current = first;
      let guard = 0;
      while (guard++ < 10) {
        chain.push(current.to);
        const nexts = (out.get(current.to) || []).filter(e => !visitedEdges.has(`${e.from}->${e.to}:${e.txid}`));
        if ((inc.get(current.to) || []).length !== 1 || nexts.length !== 1) break;
        current = nexts[0];
      }
      if (chain.length >= PEEL_CHAIN_MIN_HOPS + 1) {
        const amounts = chain.slice(0, -1).map(addr => {
          const edge = (out.get(addr) || []).find(e => e.to === chain[chain.indexOf(addr) + 1]);
          return edge?.sats || 0;
        });
        const decreasing = amounts.every((v, i) => i === 0 || (v < amounts[i - 1] && v > 0));
        const ratioOk = amounts.every((v, i) => {
          if (i === 0) return true;
          const r = v / amounts[i - 1];
          return r > PEEL_DROP_RATIO_MIN && r < PEEL_DROP_RATIO_MAX;
        });
        if (decreasing && ratioOk) chains.push(chain);
      }
    }
  }
  return chains;
}

function findFanOuts(edges) {
  const { out } = buildAdjacency(edges);
  const fans = [];
  for (const [addr, list] of out) {
    if (list.length >= FAN_OUT_MIN_EDGES) {
      const times = list.map(e => e.time).filter(Boolean);
      const windowMinutes = times.length
        ? Math.round((Math.max(...times) - Math.min(...times)) / 60000)
        : null;
      fans.push({ address: addr, recipients: list.length, windowMinutes });
    }
  }
  return fans;
}

export function analyze(graph) {
  const flags = [];
  const rapid = findRapidForwards(graph.edges);
  if (rapid.length) {
    flags.push({
      type: "RAPID_FORWARDING",
      severity: rapid.length >= 3 ? "HIGH" : "MEDIUM",
      detail: `${rapid.length} hop(s) forwarded in under 30 minutes`,
      hops: rapid.slice(0, 5)
    });
  }

  const peels = findPeelChains(graph.edges);
  if (peels.length) {
    flags.push({
      type: "PEEL_CHAIN",
      severity: "HIGH",
      detail: `${peels.length} peeling pattern(s): small amounts sent onward while the remainder keeps moving`,
      chains: peels.slice(0, 3)
    });
  }

  const fans = findFanOuts(graph.edges);
  if (fans.length) {
    flags.push({
      type: "HIGH_FAN_OUT",
      severity: "MEDIUM",
      detail: `${fans.length} address(es) paid ${FAN_OUT_MIN_EDGES}+ recipients`,
      addresses: fans.slice(0, 5)
    });
  }

  return flags;
}
