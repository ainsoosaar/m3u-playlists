export async function extractStream(page) {
  return await page.evaluate(() => {
    for (const s of document.scripts) {
      if (s.textContent.includes("kodk") && s.textContent.includes("m3u8")) {
        const m = s.textContent.match(/var kodk="([^"]+)"/);
        if (m) {
          const id = m[1].split("/")[0];
          return `https://stream.ontivi.net/${id}/index.m3u8`;
        }
      }
    }

    const entries = performance.getEntriesByType("resource");
    const res = entries.find(e => e.name.includes(".m3u8"));
    return res ? res.name : null;
  });
}
