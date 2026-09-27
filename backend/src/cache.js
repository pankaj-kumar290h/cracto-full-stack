// Minimal in-process TTL cache for read-heavy, identical-shape queries
// (the `releases` list). Under concurrent load this avoids re-running the
// same DB round trip + serialization for every single request — most of
// the requests within a TTL window are served from memory instead.
const store = new Map();

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheClear() {
  store.clear();
}
