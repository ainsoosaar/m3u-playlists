import https from "https";
import { URL } from "url";

export function sniffM3U8(page, timeout = 15000) {
  return new Promise((resolve) => {
    const found = new Set();
    let done = false;

    const onResponse = (res) => {
      const url = res.url();
      if (url.includes(".m3u8")) {
        found.add(url);
      }
    };

    const cleanup = () => {
      page.off("response", onResponse);
      clearTimeout(timer);
    };

    const timer = setTimeout(async () => {
      if (done) return;
      done = true;
      cleanup();

      const best = await selectBestByBitrate([...found]);
      resolve(best);
    }, timeout);

    page.on("response", onResponse);
  });
}

async function selectBestByBitrate(urls) {
  if (!urls.length) return null;

  // приоритет: master.m3u8
  const master = urls.find(u => u.toLowerCase().includes("master"));
  if (!master) return urls[0];

  const content = await fetchText(master);
  if (!content) return master;

  const variants = parseVariants(content, master);
  if (!variants.length) return master;

  variants.sort((a, b) => b.bandwidth - a.bandwidth);
  return variants[0].url;
}

function parseVariants(text, masterUrl) {
  const lines = text.split("\n");
  const base = new URL(masterUrl);

  const result = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
      const bwMatch = lines[i].match(/BANDWIDTH=(\d+)/);
      const bw = bwMatch ? parseInt(bwMatch[1], 10) : 0;
      const uri = lines[i + 1]?.trim();
      if (!uri) continue;

      const absUrl = new URL(uri, base).toString();
      result.push({ bandwidth: bw, url: absUrl });
    }
  }
  return result;
}

function fetchText(url, timeout = 7000) {
  return new Promise((resolve) => {
    https.get(url, res => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => resolve(data));
    }).on("error", () => resolve(null))
      .setTimeout(timeout, function () {
        this.destroy();
        resolve(null);
      });
  });
}
