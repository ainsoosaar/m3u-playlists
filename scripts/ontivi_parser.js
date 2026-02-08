export async function extractStream(page) {
  try {
    return await page.evaluate(() => {
      // Проверяем скрипты
      for (const s of document.scripts) {
        if (s.textContent.includes(".m3u8")) {
          const match = s.textContent.match(/https?:\/\/[^\s'"]+\.m3u8/);
          if (match) return match[0];
        }
      }

      // Проверяем ресурсы
      const entries = performance.getEntriesByType("resource");
      const res = entries.find(e => e.name.endsWith(".m3u8"));
      if (res) return res.name;

      // Проверяем video/source
      const videoEl = document.querySelector("video source[src$='.m3u8'], video[src$='.m3u8']");
      if (videoEl) return videoEl.src;

      return null;
    });
  } catch (e) {
    console.warn("Ошибка при извлечении потока:", e.message);
    return null;
  }
}
