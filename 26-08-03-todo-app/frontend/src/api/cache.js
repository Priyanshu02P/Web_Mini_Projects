/**
 * Tiny in-memory cache for API GET responses.
 *  - 60s TTL per entry
 *  - in-flight request de-duplication (same key => one network call)
 *  - cache-hit / cache-miss counters (subscribable for UI)
 *  - epoch guard: a response that started before an invalidation is never stored
 */

export const CACHE_TTL_MS = 60 * 1000;
const MAX_ENTRIES = 100;

const store = new Map(); // key -> { value, expiresAt }
const inflight = new Map(); // key -> Promise
const listeners = new Set();

let epoch = 0;
let stats = { hits: 0, misses: 0 };

const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

function bump(field, key) {
  stats = { ...stats, [field]: stats[field] + 1 };
  if (import.meta.env?.DEV) {
    console.debug(`[cache] ${field === 'hits' ? 'HIT ' : 'MISS'} ${key}`, stats);
  }
  listeners.forEach((l) => l());
}

function readFresh(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry;
}

export function setCache(key, value) {
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    store.delete(store.keys().next().value); // evict oldest
  }
  store.set(key, { value: clone(value), expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Return cached value for `key` or call `fetcher`, cache and return its result. */
export async function cached(key, fetcher) {
  const entry = readFresh(key);
  if (entry) {
    bump('hits', key);
    return clone(entry.value);
  }

  if (inflight.has(key)) {
    // Another caller is already fetching this key: no extra network call.
    bump('hits', key);
    return clone(await inflight.get(key));
  }

  bump('misses', key);
  const startEpoch = epoch;
  const promise = (async () => {
    const value = await fetcher();
    if (startEpoch === epoch) setCache(key, value);
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return clone(await promise);
}

export function invalidate(prefix) {
  epoch += 1;
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

export function deleteKey(key) {
  epoch += 1;
  store.delete(key);
  inflight.delete(key);
}

/** Wipe everything (login / logout / 401). Counters are kept. */
export function clearCache() {
  epoch += 1;
  store.clear();
  inflight.clear();
}

// ---- stats (works with React's useSyncExternalStore) ----
export function getCacheStats() {
  return stats;
}

export function subscribeCacheStats(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetCacheStats() {
  stats = { hits: 0, misses: 0 };
  listeners.forEach((l) => l());
}
