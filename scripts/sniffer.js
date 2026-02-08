export async function sniffM3U8(page, timeout = 20000) {
  const client = await page.target().createCDPSession();
  await client.send("Network.enable");

  const found = new Set();

  client.on("Network.requestWillBeSent", e => {
    if (e.request.url.includes(".m3u8")) {
      found.add(e.request.url);
    }
  });

  await kickPlayer(page);

  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (found.size) break;
    await page.waitForTimeout(1000);
  }

  return found.size ? [...found] : null;
}

async function kickPlayer(page) {
  try {
    await page.mouse.move(300, 300);
    await page.mouse.click(300, 300);

    await page.evaluate(() => {
      document.querySelectorAll("video").forEach(v => {
        try { v.muted = true; v.play(); } catch {}
      });
    });

    for (const frame of page.frames()) {
      try {
        await frame.evaluate(() => {
          document.querySelectorAll("video").forEach(v => {
            try { v.muted = true; v.play(); } catch {}
          });
        });
      } catch {}
    }
  } catch {}
}
