import fs from "fs";
import puppeteer from "puppeteer";
import channels from "./channels.json" assert { type: "json" };
import { extractStream } from "./ontivi_parser.js";

const OUTPUT = "playlists/ip.ontivi.net_playlist.m3u8";

const header = `#EXTM3U url-tvg="https://epg.it999.ru/epg.xml.gz"\n\n`;

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });

  let playlist = header;

  for (const ch of channels) {
    const page = await browser.newPage();
    try {
      await page.goto(ch.page, { waitUntil: "networkidle2", timeout: 30000 });
      await page.waitForTimeout(5000);

      const stream = await extractStream(page);
      console.log(ch.name, "->", stream);

      if (!stream || !stream.endsWith(".m3u8")) {
        console.warn(`Пропускаем канал ${ch.name}, поток не найден`);
        continue;
      }

      playlist +=
`#EXTINF:-1 tvg-id="${ch.tvgId}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}
${stream}\n\n`;

    } catch (e) {
      console.error("Ошибка при обработке канала:", ch.name, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  fs.writeFileSync(OUTPUT, playlist, "utf8");
  console.log(`Плейлист сохранён: ${OUTPUT}`);
})();
