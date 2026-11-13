export function scoreRisk({
  knownVasp = false,
  rapidMovement = false,
  intermediaryCount = 0,
  crossChain = false,
  largeTransfer = false
}) {
  let score = 0;
  const indicators = [];

  if (knownVasp) { score += 10; indicators.push("Known/attributed VASP interaction"); }
  if (rapidMovement) { score += 10; indicators.push("Rapid fund movement"); }
  if (intermediaryCount > 0) {
    score += Math.min(20, intermediaryCount * 10);
    indicators.push("Potential intermediary wallet pattern");
  }
  if (crossChain) { score += 15; indicators.push("Potential cross-chain movement"); }
  if (largeTransfer) { score += 10; indicators.push("Large transfer"); }

  return {
    score: Math.min(score, 100),
    category: score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" :
      score >= 30 ? "MEDIUM" : "LOW",
    indicators,
    disclaimer: "Risk score is an analytical indicator, not proof of criminal activity."
  };
}
