import fs from "fs";
import puppeteer from "puppeteer";
import channels from "./channels.json" assert { type: "json" };
import { sniffM3U8 } from "./ontivi_sniffer.js";

const OUTPUT_FILE = "playlists/ip.ontivi.net_playlist.m3u8";
const EPG_URL = "https://epg.it999.ru/epg.xml.gz";

const NAV_TIMEOUT = 30000;
const SNIFF_TIMEOUT = 15000;

async function processChannel(browser, channel) {
  const page = await browser.newPage();

  try {
    await page.setRequestInterception(true);

    page.on("request", (req) => {
      const type = req.resourceType();
      if (type === "image" || type === "font" || type === "stylesheet") {
        req.abort();
      } else {
        req.continue();
      }
    });

    const sniffPromise = sniffM3U8(page, SNIFF_TIMEOUT);

    await page.goto(channel.page, {
      waitUntil: "networkidle2",
      timeout: NAV_TIMEOUT
    });

    const streamUrl = await sniffPromise;
    return streamUrl;

  } catch (err) {
    console.error(`⚠️ ERROR: ${channel.name} → ${err.message}`);
    return null;

  } finally {
    if (!page.isClosed()) {
      try {
        await page.close();
      } catch (_) {}
    }
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });

  let playlist = `#EXTM3U url-tvg="${EPG_URL}"\n\n`;

  let ok = 0;
  let fail = 0;

  for (const channel of channels) {
    const stream = await processChannel(browser, channel);

    if (!stream) {
      console.log(`❌ STREAM NOT FOUND: ${channel.name}`);
      fail++;
      continue;
    }

    playlist +=
`#EXTINF:-1 tvg-id="${channel.tvgId}" tvg-name="${channel.name}" tvg-logo="${channel.logo}" group-title="${channel.group}",${channel.name}
${stream}

`;

    console.log(`✅ OK: ${channel.name}`);
    ok++;
  }

  await browser.close();

  fs.writeFileSync(OUTPUT_FILE, playlist, "utf8");

  console.log("────────────────────────");
  console.log(`✔ Channels OK:   ${ok}`);
  console.log(`✖ Channels FAIL: ${fail}`);
  console.log("🎉 Playlist generated");
})();
