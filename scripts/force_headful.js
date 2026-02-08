import fs from "fs";
import puppeteer from "puppeteer";
import { sniffForceM3U8 } from "./sniffer_force.js";
import { loadCache, setCached, saveCache } from "./cache.js";
import { initStats, ok, fail } from "./stats.js";

const channels = JSON.parse(fs.readFileSync("scripts/channels.json"));
const out = "playlists/ip.ontivi.net_playlist.m3u8";

const cache = loadCache();
const stats = initStats();

const browser = await puppeteer.launch({
  headless: false,
  args: ["--no-sandbox","--disable-setuid-sandbox","--autoplay-policy=no-user-gesture-required","--disable-gpu","--window-size=1280,800"]
});

let m3u = "#EXTM3U\n\n";
console.log(`🕒 FORCE HEADFUL UPDATE START: ${channels.length} channels`);

for (const ch of channels) {
  console.log(`\n▶ Processing channel: ${ch.name}`);
  let stream = null;
  const page = await browser.newPage();

  try {
    await page.goto(ch.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    stream = await sniffForceM3U8(page);
    if (stream) console.log(`✅ Found new HLS stream: ${stream}`);
  } catch (err) {
    console.log(`⛔ Error processing channel: ${err.message}`);
  }

  await page.close();

  if (!stream) {
    const cached = cache[ch.name]?.url;
    if (cached) {
      stream = cached;
      console.log(`⚠ Using cached stream: ${stream}`);
    }
  }

  if (!stream) {
    fail(stats, ch.name);
    console.log(`❌ No valid HLS found for: ${ch.name}`);
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
console.log("\n✅ FORCE HEADFUL UPDATE DONE");
console.log(`🔹 Success: ${stats.ok}, Failed: ${stats.fail}`);
