import fs from "fs";

const FILE = "scripts/streams_cache.json";

export function loadCache() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE));
}

export function setCached(cache, name, url) {
  cache[name] = { url, ts: Date.now() };
}

export function saveCache(cache) {
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
}
