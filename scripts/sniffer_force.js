import https from "https";

export async function sniffM3U8(page, timeout = 6000) {
  const client = await page.target().createCDPSession();
  await client.send("Network.enable");

  const found = new Set();

  client.on("Network.requestWillBeSent", e => {
    if (e.request.url.includes(".m3u8")) found.add(e.request.url);
  });

  // Попытка запустить плееры на странице
  await page.evaluate(() => {
    document.querySelectorAll("video").forEach(v => {
      try { v.muted = true; v.play(); } catch {}
    });
    for (const frame of page.frames()) {
      try {
        frame.evaluate(() => {
          document.querySelectorAll("video").forEach(v => {
            try { v.muted = true; v.play(); } catch {}
          });
        });
      } catch {}
    }
  });

  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (found.size) break;
    await page.waitForTimeout(500);
  }

  const urls = [...found];
  const valid = [];

  for (const url of urls) {
    if (await isValidM3U8(url)) valid.push(url);
  }

  return valid.length ? valid : null;
}

async function isValidM3U8(url) {
  return new Promise(resolve => {
    https.get(url, res => {
      const ct = res.headers["content-type"] || "";
      if (!ct.includes("application") && !ct.includes("mpegurl")) {
        res.resume();
        return resolve(false);
      }
      let data = "";
      res.on("data", c => {
        data += c.toString();
        if (data.length > 200) res.destroy();
      });
      res.on("end", () => resolve(data.includes("#EXTM3U")));
    }).on("error", () => resolve(false));
  });
}
