export async function sniffM3U8(page, timeout = 20000) {
  const client = await page.target().createCDPSession();
  await client.send("Network.enable");

  const found = new Set();

  client.on("Network.requestWillBeSent", e => {
    if (e.request.url.includes(".m3u8")) {
      found.add(e.request.url);
    }
  });

  await page.evaluate(() => {
    document.querySelectorAll("video").forEach(v => {
      try { v.muted = true; v.play(); } catch {}
    });
  });

  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (found.size) break;
    await page.waitForTimeout(1000);
  }

  return found.size ? [...found] : null;
}
