import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { verifyTransaction } from "./services/transactionVerifier.js";
import { traceWallet } from "./services/tracer.js";
import { scoreRisk } from "./services/risk.js";
import { lookupVasp } from "./services/attribution.js";
import { lookup as btcLookup, trace as btcTrace } from "./services/bitcoinTracer.js";
import { clearExpiredCache } from "./services/mempoolClient.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_, res) => res.json({ ok: true, mode: "demo" }));

app.post("/api/verify", async (req, res) => {
  try { res.json(await verifyTransaction(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.post("/api/trace", async (req, res) => {
  try { res.json(await traceWallet(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.post("/api/risk", (req, res) => {
  try { res.json(scoreRisk(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.post("/api/attribution", (req, res) => {
  try { res.json(lookupVasp(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

setInterval(clearExpiredCache, 10 * 60 * 1000).unref?.();

app.post("/api/btc/lookup", async (req, res) => {
  try {
    const { network = "testnet4", query } = req.body || {};
    res.json(await btcLookup(network, query));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post("/api/btc/trace", async (req, res) => {
  try {
    const { network = "testnet4", query, hops } = req.body || {};
    res.json(await btcTrace(network, query, hops));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

const port = process.env.PORT || 4000;

if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

export default app;
