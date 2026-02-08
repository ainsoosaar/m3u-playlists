import fs from "fs";
import puppeteer from "puppeteer";
import channels from "./channels.json" assert { type: "json" };
import { sniffM3U8 } from "./sniffer.js";

const OUTPUT = "playlists/ip.ontivi.net_playlist.m3u8";
const EPG = "https://epg.it999.ru/epg.xml.gz";

const NAV_TIMEOUT = 30000;
const SNIFF_TIMEOUT = 15000;

async function fetchStream(browser, channel) {
  const page = await browser.newPage();

  try {
    await page.setRequestInterception(true);

    page.on("request", (req) => {
      const t = req.resourceType();
      if (t === "image" || t === "font" || t === "stylesheet") {
        req.abort();
      } else {
        req.continue();
      }
    });

    const sniff = sniffM3U8(page, SNIFF_TIMEOUT);

    await page.goto(channel.page, {
      waitUntil: "networkidle2",
      timeout: NAV_TIMEOUT
    });

    return await sniff;

  } catch {
    return null;
  } finally {
    if (!page.isClosed()) {
      try { await page.close(); } catch {}
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

  let playlist = `#EXTM3U url-tvg="${EPG}"\n\n`;
  let ok = 0;
  let fail = 0;

  for (const ch of channels) {
    const stream = await fetchStream(browser, ch);

    if (!stream) {
      console.log(`❌ ${ch.name}`);
      fail++;
      continue;
    }

    playlist +=
`#EXTINF:-1 tvg-id="${ch.tvgId}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}
${stream}

`;

    console.log(`✅ ${ch.name}`);
    ok++;
  }

  await browser.close();

  fs.writeFileSync(OUTPUT, playlist, "utf8");

  console.log("──────────────");
  console.log(`OK:   ${ok}`);
  console.log(`FAIL: ${fail}`);
})();
