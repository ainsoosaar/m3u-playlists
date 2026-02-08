import fs from "fs";
import puppeteer from "puppeteer";
import { sniffM3U8 } from "./sniffer.js";
import { selectBest } from "./hls.js";
import { loadCache, getCached, setCached, saveCache } from "./cache.js";
import { initStats, ok, fail } from "./stats.js";

const channels = JSON.parse(fs.readFileSync("scripts/channels.json"));
const out = "playlists/ip.ontivi.net_playlist.m3u8";

const cache = loadCache();
const stats = initStats();

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"]
});

let m3u = "#EXTM3U\n\n";

for (const ch of channels) {
  console.log("▶", ch.name);
  let stream = null;
  const page = await browser.newPage();

  try {
    await page.goto(ch.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    const urls = await sniffM3U8(page);
    if (urls) stream = await selectBest(urls);
  } catch {}

  await page.close();

  if (!stream) {
    stream = getCached(cache, ch.name);
    if (!stream) {
      fail(stats, ch.name);
      continue;
    }
    console.log("↩ cache used:", ch.name);
  }

  // Только валидный HLS в кеш
  if (stream && stream.startsWith("http") && stream.includes(".m3u8")) {
    setCached(cache, ch.name, stream);
    ok(stats, ch.name, stream);
  } else {
    console.log("⛔ INVALID STREAM, SKIP:", ch.name);
    fail(stats, ch.name);
    continue;
  }

  m3u += `#EXTINF:-1 tvg-id="${ch.epg}" tvg-name="${ch.epg}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}\n`;
  m3u += `${stream}\n\n`;
}

await browser.close();

fs.writeFileSync(out, m3u);
saveCache(cache);
fs.writeFileSync("scripts/stats.json", JSON.stringify(stats, null, 2));

console.log("✅ HYBRID IPTV BUILD DONE");
