import fs from "fs";
import puppeteer from "puppeteer";
import channels from "./channels.json" assert { type: "json" };
import { sniffM3U8 } from "./ontivi_sniffer.js";

const OUTPUT_FILE = "playlists/ip.ontivi.net_playlist.m3u8";
const EPG_URL = "https://epg.it999.ru/epg.xml.gz";

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

  for (const channel of channels) {
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

      const sniffPromise = sniffM3U8(page);

      await page.goto(channel.page, {
        waitUntil: "networkidle2",
        timeout: 30000
      });

      const streamUrl = await sniffPromise;

      if (!streamUrl) {
        console.error(`❌ STREAM NOT FOUND: ${channel.name}`);
        await page.close();
        continue;
      }

      playlist +=
`#EXTINF:-1 tvg-id="${channel.tvgId}" tvg-name="${channel.name}" tvg-logo="${channel.logo}" group-title="${channel.group}",${channel.name}
${streamUrl}

`;

      console.log(`✅ OK: ${channel.name}`);

    } catch (err) {
      console.error(`⚠️ ERROR: ${channel.name}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  fs.writeFileSync(OUTPUT_FILE, playlist, "utf8");

  console.log("🎉 PLAYLIST GENERATED");
})();
