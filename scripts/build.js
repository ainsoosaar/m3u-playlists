import fs from "fs";
import puppeteer from "puppeteer";
import { sniffM3U8 } from "./sniffer.js";
import { selectBestStream } from "./hls.js";

const channels = JSON.parse(fs.readFileSync("scripts/channels.json"));
const cacheFile = "scripts/streams_cache.json";
const outFile = "playlists/ip.ontivi.net_playlist.m3u8";

let cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile)) : {};
let stats = { ok: 0, fail: 0, cdn: {}, channels: {} };

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"]
});

let m3u = "#EXTM3U\n\n";

for (const ch of channels) {
  console.log("▶", ch.name);
  const page = await browser.newPage();
  let stream = null;

  try {
    await page.goto(ch.url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const m3u8s = await sniffM3U8(page);
    if (m3u8s) stream = await selectBestStream(m3u8s);
  } catch {}

  await page.close();

  if (!stream) stream = cache[ch.name];

  if (!stream) {
    console.log("❌", ch.name);
    stats.fail++;
    stats.channels[ch.name] = "fail";
    continue;
  }

  cache[ch.name] = stream;
  stats.ok++;
  stats.channels[ch.name] = "ok";

  const cdn = new URL(stream).hostname;
  stats.cdn[cdn] = (stats.cdn[cdn] || 0) + 1;

  m3u += `#EXTINF:-1 tvg-id="${ch.epg}" tvg-name="${ch.epg}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}\n`;
  m3u += `${stream}\n\n`;
}

await browser.close();

fs.writeFileSync(outFile, m3u);
fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
fs.writeFileSync("scripts/stats.json", JSON.stringify(stats, null, 2));

console.log("✅ v2 build complete");
