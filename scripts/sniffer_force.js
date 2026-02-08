import { isValidM3U8 } from "./hls.js";

export async function sniffForceM3U8(page) {
  const urls = new Set();

  // Network sniff
  const client = await page.target().createCDPSession();
  await client.send("Network.enable");
  client.on("Network.requestWillBeSent", e => {
    if (e.request.url.includes(".m3u8")) urls.add(e.request.url);
  });

  // Kick player
  await kickPlayer(page);

  // JS variables / <script> sniff
  const jsUrls = await page.evaluate(() => {
    const found = [];
    for (const key in window) {
      try {
        const val = window[key];
        if (typeof val === "object" && val?.file?.includes?.(".m3u8")) {
          found.push(val.file);
        }
      } catch {}
    }
    const scripts = Array.from(document.querySelectorAll("script")).map(s => s.textContent);
    for (const s of scripts) {
      const m = s.match(/["'](https?:\/\/[^"']+\.m3u8)["']/g);
      if (m) found.push(...m.map(x => x.replace(/['"]/g, "")));
    }
    return found;
  });

  for (const u of jsUrls) urls.add(u);

  for (const u of urls) {
    if (await isValidM3U8(u)) return u;
  }
  return null;
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
