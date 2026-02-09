import fs from "fs";
import puppeteer from "puppeteer";
import { sniffM3U8 } from "./sniffer.js";
import { selectBest } from "./hls.js";
import { loadCache, setCached, saveCache } from "./cache.js";

const channels = JSON.parse(fs.readFileSync("scripts/channels.json"));
const out = "playlists/ip.ontivi.net_playlist.m3u8";
const cache = loadCache();

const browser = await puppeteer.launch({ headless: false });
let m3u = "#EXTM3U\n\n";

for (const ch of channels) {
  const page = await browser.newPage();
  await page.goto(ch.url, { waitUntil: "networkidle2" });

  const urls = await sniffM3U8(page, 30000);
  if (urls) {
    const stream = await selectBest(urls);
    if (stream) {
      setCached(cache, ch.name, stream);
      m3u += `#EXTINF:-1,${ch.name}\n${stream}\n\n`;
    }
  }

  await page.close();
}

await browser.close();
saveCache(cache);
fs.writeFileSync(out, m3u);
