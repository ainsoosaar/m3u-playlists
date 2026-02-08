import fs from "fs";
import puppeteer from "puppeteer";
import { sniffM3U8 } from "./sniffer.js";
import { selectBest } from "./hls.js";
import { loadCache, setCached, saveCache } from "./cache.js";
import { initStats, ok, fail } from "./stats.js";

const channels = JSON.parse(fs.readFileSync("scripts/channels.json"));
const out = "playlists/ip.ontivi.net_playlist.m3u8";
const cache = loadCache();
const stats = initStats();

const browser = await puppeteer.launch({
  headless: false,
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"]
});

let m3u = "#EXTM3U\n\n";
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

for (const ch of channels) {
  console.log("▶", ch.name);
  let stream = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const page = await browser.newPage();
    try {
      await page.goto(ch.url, { waitUntil: "networkidle2", timeout: 120000 });
      const urls = await sniffM3U8(page, 30000);
      if (urls) {
        stream = await selectBest(urls);
        if (stream) break;
      }
    } catch (err) {
      console.log(`⛔ Ошибка (попытка ${attempt}):`, err.message);
    } finally {
      await page.close();
    }

    if (!stream && attempt < MAX_RETRIES) {
      console.log(`⏳ Retry через ${RETRY_DELAY / 1000}s для ${ch.name}`);
      await new Promise(r => setTimeout(r, RETRY_DELAY));
    }
  }

  if (!stream) {
    fail(stats, ch.name);
    console.log("⛔ Нет валидного HLS:", ch.name);
    continue;
  }

  setCached(cache, ch.name, stream);
  ok(stats, ch.name, stream);

  m3u += `#EXTINF:-1 tvg-id="${ch.epg}" tvg-name="${ch.epg}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}\n`;
  m3u += `${stream}\n\n`;
}

await browser.close();
saveCache(cache);
fs.writeFileSync(out, m3u);
fs.writeFileSync("scripts/stats.json", JSON.stringify(stats, null, 2));
console.log("✅ INIT CACHE DONE");
