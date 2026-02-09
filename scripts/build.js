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

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

let m3u = "#EXTM3U\n\n";

for (const ch of channels) {
  let stream = null;
  const page = await browser.newPage();

  try {
    await page.goto(ch.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    const urls = await sniffM3U8(page);
    if (urls) stream = await selectBest(urls);
  } catch {}

  await page.close();

  if (!stream) stream = getCached(cache, ch.name);
  if (!stream) { fail(stats, ch.name); continue; }

  setCached(cache, ch.name, stream);
  ok(stats, ch.name);

  m3u += `#EXTINF:-1,${ch.name}\n${stream}\n\n`;
}

await browser.close();
fs.writeFileSync(out, m3u);
saveCache(cache);
fs.writeFileSync("scripts/stats.json", JSON.stringify(stats, null, 2));
