import https from "https";
import { URL } from "url";

export async function selectBestStream(urls) {
  let best = null;
  let bestBw = 0;

  for (const u of urls) {
    const text = await fetchText(u);
    if (!text) continue;

    if (!text.includes("#EXT-X-STREAM-INF")) {
      if (await headOK(u)) return u;
      continue;
    }

    const variants = parseVariants(text, u);
    for (const v of variants) {
      if (v.bandwidth > bestBw && await headOK(v.url)) {
        bestBw = v.bandwidth;
        best = v.url;
      }
    }
  }
  return best;
}

function parseVariants(text, base) {
  const out = [];
  const baseUrl = new URL(base);

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
      const bw = parseInt(lines[i].match(/BANDWIDTH=(\d+)/)?.[1] || 0);
      const uri = lines[i + 1]?.trim();
      if (uri) out.push({ bandwidth: bw, url: new URL(uri, baseUrl).toString() });
    }
  }
  return out;
}

function fetchText(url) {
  return new Promise(res => {
    https.get(url, r => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => res(d));
    }).on("error", () => res(null));
  });
}

function headOK(url) {
  return new Promise(res => {
    https.request(url, { method: "HEAD" }, r => res(r.statusCode === 200))
      .on("error", () => res(false))
      .end();
  });
}
