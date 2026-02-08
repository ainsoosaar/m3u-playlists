import fs from "fs";
import puppeteer from "puppeteer";
import channels from "./channels.json" assert { type: "json" };

const OUTPUT = "playlists/ip.ontivi.net_playlist.m3u8";
const header = `#EXTM3U url-tvg="https://epg.it999.ru/epg.xml.gz"\n\n`;

async function getStream(page) {
  await page.waitForTimeout(5000);

  return await page.evaluate(() => {
    for (const s of document.scripts) {
      const match = s.textContent.match(/https?:\/\/[^\s'"]+\.m3u8/);
      if (match) return match[0];
    }
    const video = document.querySelector("video source[src$='.m3u8'], video[src$='.m3u8']");
    if (video) return video.src;
    return null;
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  let playlist = header;

  for (const ch of channels) {
    const page = await browser.newPage();
    try {
      await page.goto(ch.page, { waitUntil: "networkidle2", timeout: 30000 });
      const stream = await getStream(page);

      if (!stream) {
        console.warn(`Пропускаем канал ${ch.name}: поток не найден`);
        await page.close();
        continue;
      }

      console.log(ch.name, "->", stream);

      playlist +=
`#EXTINF:-1 tvg-id="${ch.tvgId}" tvg-name="${ch.name}" tvg-logo="${ch.logo}" group-title="${ch.group}",${ch.name}
${stream}\n\n`;

    } catch (err) {
      console.error("Ошибка при обработке канала:", ch.name, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  fs.writeFileSync(OUTPUT, playlist, "utf8");
  console.log(`Плейлист сохранён: ${OUTPUT}`);
})();
