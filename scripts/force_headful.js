import fs from "fs";
import puppeteer from "puppeteer";
import { sniffM3U8 } from "./sniffer_force.js";
import { loadCache, setCached, saveCache } from "./cache.js";
import { initStats, ok, fail } from "./stats.js";

const channels = JSON.parse(fs.readFileSync("channels.json"));
const out = "playlists/ip.ontivi.net_playlist.m3u8";

const cache = loadCache();
const stats = initStats();

const browser = await puppeteer.launch({ headless: false });

let m3u = "#EXTM3U\n\n";

for (const ch of channels) {
  console.log("▶ HEADFUL:", ch.name);
  const page = await browser.newPage();
  let stream = null;

  try {
    await page.goto(ch.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    const urls = await sniffM3U8(page, 6000);
    if (urls) stream = urls[0];
  } catch {}

  await page.close();

  if (!stream) {
    stream = cache[ch.name]?.url || null;
    if (!stream) {
      fail(stats, ch.name);
      continue;
    }
    console.log("↩ cache used:", ch.name);
  } else {
    setCached(cache, ch.name, stream);
  }

  ok(stats, ch.name, stream);

  m3u += `#EXTINF:-1 tvg-id="${ch.epg}" tvg-name="${ch.epg}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}\n`;
  m3u += `${stream}\n\n`;
}

await browser.close();
fs.writeFileSync(out, m3u);
saveCache(cache);
fs.writeFileSync("scripts/stats.json", JSON.stringify(stats, null, 2));

console.log("✅ HEADFUL IPTV BUILD DONE");
