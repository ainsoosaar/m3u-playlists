export async function sniffM3U8(page, timeout = 20000) {
  const client = await page.target().createCDPSession();
  await client.send("Network.enable");

  const found = new Set();

  client.on("Network.requestWillBeSent", e => {
    const url = e.request.url;
    if (url.includes(".m3u8")) found.add(url);
  });

  // 👉 запускаем плеер
  await kickPlayer(page);

  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (found.size) break;
    await page.waitForTimeout(1000);
  }

  if (!found.size) return null;

  return [...found];
}

async function kickPlayer(page) {
  // mouse
  await page.mouse.move(300, 300);
  await page.mouse.click(300, 300);

  // video.play()
  await page.evaluate(() => {
    document.querySelectorAll("video").forEach(v => {
      try { v.muted = true; v.play(); } catch {}
    });
  });

  // iframe dive
  for (const frame of page.frames()) {
    try {
      await frame.evaluate(() => {
        document.querySelectorAll("video").forEach(v => {
          try { v.muted = true; v.play(); } catch {}
        });
      });
    } catch {}
  }
}
