import https from "https";
import { URL } from "url";

export async function sniffM3U8(page) {
  await page.waitForTimeout(6000);

  const urls = new Set();

  const listener = res => {
    const u = res.url();
    if (u.includes(".m3u8")) urls.add(u);
  };

  page.on("response", listener);
  await page.waitForTimeout(8000);
  page.off("response", listener);

  const list = [...urls].filter(u => !u.includes("master") || !u.includes("0"));
  if (!list.length) return null;

  return await selectBestByBitrate(list);
}

async function selectBestByBitrate(urls) {
  let best = null;
  let maxBw = 0;

  for (const u of urls) {
    const text = await fetchText(u);
    if (!text) continue;

    const variants = parseVariants(text, u);
    for (const v of variants) {
      if (v.bandwidth > maxBw) {
        maxBw = v.bandwidth;
        best = v.url;
      }
    }
  }
  return best;
}

function parseVariants(text, baseUrl) {
  const lines = text.split("\n");
  const base = new URL(baseUrl);
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
      const bw = parseInt(lines[i].match(/BANDWIDTH=(\d+)/)?.[1] || 0);
      const uri = lines[i + 1]?.trim();
      if (uri) {
        out.push({
          bandwidth: bw,
          url: new URL(uri, base).toString()
        });
      }
    }
  }
  return out;
}

function fetchText(url, timeout = 7000) {
  return new Promise(resolve => {
    https.get(url, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => resolve(d));
    }).on("error", () => resolve(null))
      .setTimeout(timeout, function () {
        this.destroy();
        resolve(null);
      });
  });
}
