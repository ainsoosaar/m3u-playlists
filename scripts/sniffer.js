export async function sniffM3U8(page) {
  const client = await page.target().createCDPSession();
  await client.send("Network.enable");

  const found = new Set();

  client.on("Network.requestWillBeSent", e => {
    const u = e.request.url;
    if (u.includes(".m3u8")) found.add(u);
  });

  await kick(page);

  const start = Date.now();
  while (Date.now() - start < 25000) {
    if (found.size) break;
    await page.waitForTimeout(1000);
  }

  return [...found];
}

async function kick(page) {
  await page.mouse.move(320, 320);
  await page.mouse.click(320, 320);

  await page.evaluate(() => {
    document.querySelectorAll("video").forEach(v => {
      try { v.muted = true; v.play(); } catch {}
    });
  });

  for (const f of page.frames()) {
    try {
      await f.evaluate(() => {
        document.querySelectorAll("video").forEach(v => {
          try { v.muted = true; v.play(); } catch {}
        });
      });
    } catch {}
  }
}
