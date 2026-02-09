import fs from "fs";

const FILE = "scripts/streams_cache.json";
const TTL = 1000 * 60 * 60 * 24; // 24 часа

export function loadCache() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

export function getCached(cache, name) {
  const c = cache[name];
  if (!c) return null;
  if (Date.now() - c.ts > TTL) return null;
  return c.url;
}

export function setCached(cache, name, url) {
  cache[name] = { url, ts: Date.now() };
}

export function saveCache(cache) {
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
}
