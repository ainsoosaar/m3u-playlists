import fs from "fs";
import puppeteer from "puppeteer";
import https from "https";
import { sniffM3U8 } from "./sniffer.js";

const channels = JSON.parse(fs.readFileSync("scripts/channels.json"));
const cacheFile = "scripts/streams_cache.json";
const outFile = "playlists/ip.ontivi.net_playlist.m3u8";

let cache = fs.existsSync(cacheFile)
  ? JSON.parse(fs.readFileSync(cacheFile))
  : {};

const stats = {
  generatedAt: new Date().toISOString(),
  total: channels.length,
  ok: 0,
  fail: 0,
  cdn: {},
  channels: {}
};

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox"]
});

let m3u = "#EXTM3U\n\n";

for (const ch of channels) {
  console.log("▶", ch.name);
  const page = await browser.newPage();

  let stream = null;

  try {
    await page.goto(ch.url, { waitUntil: "networkidle2", timeout: 60000 });
    stream = await sniffM3U8(page);

    if (stream && await checkHealth(stream)) {
      cache[ch.name] = stream;
    } else {
      stream = cache[ch.name] || null;
    }
  } catch {
    stream = cache[ch.name] || null;
  }

  await page.close();

  if (!stream) {
    console.log("❌", ch.name);
    stats.fail++;
    stats.channels[ch.name] = "fail";
    continue;
  }

  const cdn = new URL(stream).hostname;
  stats.cdn[cdn] = (stats.cdn[cdn] || 0) + 1;
  stats.ok++;
  stats.channels[ch.name] = "ok";

  m3u += `#EXTINF:-1 tvg-id="${ch.epg}" tvg-name="${ch.epg}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}\n`;
  m3u += `${stream}\n\n`;
}

await browser.close();

fs.writeFileSync(outFile, m3u, "utf8");
fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
fs.writeFileSync("scripts/stats.json", JSON.stringify(stats, null, 2));

console.log("✅ DONE");

function checkHealth(m3u8) {
  return new Promise(resolve => {
    https.get(m3u8, res => resolve(res.statusCode === 200))
      .on("error", () => resolve(false));
  });
}
