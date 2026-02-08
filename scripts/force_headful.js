import fs from "fs";
import puppeteer from "puppeteer";
import { sniffM3U8 } from "./sniffer.js";
import { selectBest, isValidM3U8 } from "./hls.js";
import { loadCache, setCached, saveCache } from "./cache.js";
import { initStats, ok, fail } from "./stats.js";

const channels = JSON.parse(fs.readFileSync("scripts/channels.json"));
const out = "playlists/ip.ontivi.net_playlist.m3u8";

const cache = loadCache();
const stats = initStats();

// Headful browser (with UI emulation)
const browser = await puppeteer.launch({
  headless: false, // headful режим
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-gpu",
    "--window-size=1280,800"
  ]
});

let m3u = "#EXTM3U\n\n";

for (const ch of channels) {
  console.log("▶", ch.name);

  let stream = null;
  const page = await browser.newPage();

  try {
    await page.goto(ch.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    const urls = await sniffM3U8(page, 30000); // увеличенный таймаут для headful
    if (urls) {
      stream = await selectBest(urls);
    }
  } catch (err) {
    console.log("⛔ Ошибка sniff:", err.message);
  }

  await page.close();

  // fallback на кеш
  if (!stream || !(await isValidM3U8(stream))) {
    const cached = cache[ch.name]?.url;
    if (cached && (await isValidM3U8(cached))) {
      stream = cached;
      console.log("⚠ Cached fallback used:", ch.name);
    }
  }

  if (!stream) {
    fail(stats, ch.name);
    console.log("⛔ Нет валидного HLS:", ch.name);
    continue;
  }

  // Сохраняем валидный поток в кеш
  setCached(cache, ch.name, stream);
  ok(stats, ch.name, stream);

  // Формируем плейлист
  m3u += `#EXTINF:-1 tvg-id="${ch.epg}" tvg-name="${ch.epg}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}\n`;
  m3u += `${stream}\n\n`;
}

await browser.close();

// Сохраняем кеш и плейлист
saveCache(cache);
fs.writeFileSync(out, m3u);
fs.writeFileSync("scripts/stats.json", JSON.stringify(stats, null, 2));

console.log("✅ FORCE HEADFUL UPDATE DONE");
