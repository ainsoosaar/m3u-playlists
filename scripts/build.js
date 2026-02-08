import fs from "fs";
import puppeteer from "puppeteer";
import { runPool } from "./crawler.js";
import { sniffM3U8 } from "./sniffer.js";
import { selectStream } from "./hls.js";
import { loadCache, getCached, setCached, saveCache } from "./cache.js";
import { initStats, logOK, logFail } from "./stats.js";

const channels = JSON.parse(fs.readFileSync("scripts/channels.json"));
const out = "playlists/ip.ontivi.net_playlist.m3u8";

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"]
});

const cache = loadCache();
const stats = initStats();

let m3u = "#EXTM3U\n\n";

await runPool(channels, 5, async ch => {
  const page = await browser.newPage();
  let stream = null;

  try {
    await page.goto(ch.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    const urls = await sniffM3U8(page);
    if (urls?.length) stream = await selectStream(urls);
  } catch {}

  await page.close();

  if (!stream) stream = getCached(cache, ch.name);

  if (!stream) {
    logFail(stats, ch.name);
    return;
  }

  setCached(cache, ch.name, stream);
  logOK(stats, ch.name, stream);

  m3u += `#EXTINF:-1 tvg-id="${ch.epg}" tvg-name="${ch.epg}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}\n${stream}\n\n`;
});

await browser.close();

fs.writeFileSync(out, m3u);
saveCache(cache);
fs.writeFileSync("scripts/stats.json", JSON.stringify(stats, null, 2));

console.log("✅ IPTV v3 DONE");
