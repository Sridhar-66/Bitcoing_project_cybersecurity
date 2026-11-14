const BASE_URLS = {
  main: "https://mempool.space/api",
  testnet4: "https://mempool.space/testnet4/api",
  testnet3: "https://mempool.space/testnet/api"
};

export function isSupportedNetwork(network) {
  return Boolean(BASE_URLS[network]);
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
const inflight = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, { retries = 3, baseDelayMs = 800 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.status === 429 || res.status === 503) {
        const retryAfterSec = Number(res.headers.get("retry-after"));
        const delayMs = retryAfterSec ? retryAfterSec * 1000 : baseDelayMs * 2 ** attempt;
        if (attempt < retries) { await sleep(delayMs); continue; }
        throw new Error(`Upstream rate-limited (429/503) after ${retries + 1} attempts: ${url}`);
      }
      if (!res.ok) {
        if (res.status === 400) {
          throw new Error("Not a valid address or transaction id for the selected network");
        }
        throw new Error(`Upstream ${res.status} for ${url}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < retries) await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}

export async function mempoolGet(network, path) {
  const key = `${network}:${path}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  if (inflight.has(key)) return inflight.get(key);

  const pending = (async () => {
    try {
      const value = await fetchWithRetry(`${BASE_URLS[network]}${path}`);
      cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, pending);
  return pending;
}

export function clearExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expires <= now) cache.delete(key);
  }
}
