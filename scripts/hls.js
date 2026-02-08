import https from "https";
import { URL } from "url";

export async function selectBest(urls) {
  let best = null;
  let bwMax = 0;

  for (const u of urls) {
    const txt = await fetch(u);
    if (!txt) continue;

    if (!txt.includes("#EXT-X-STREAM-INF")) {
      if (await headOK(u)) return u;
      continue;
    }

    for (const v of parse(txt, u)) {
      if (v.bw > bwMax && await headOK(v.url)) {
        bwMax = v.bw;
        best = v.url;
      }
    }
  }
  return best;
}

function parse(txt, base) {
  const out = [];
  const b = new URL(base);
  const l = txt.split("\n");

  for (let i = 0; i < l.length; i++) {
    if (l[i].startsWith("#EXT-X-STREAM-INF")) {
      const bw = +l[i].match(/BANDWIDTH=(\d+)/)?.[1] || 0;
      const uri = l[i + 1]?.trim();
      if (uri) out.push({ bw, url: new URL(uri, b).toString() });
    }
  }
  return out;
}

function fetch(url) {
  return new Promise(r => {
    https.get(url, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => r(d));
    }).on("error", () => r(null));
  });
}

function headOK(url) {
  return new Promise(r => {
    https.request(url, { method: "HEAD" }, res => r(res.statusCode === 200))
      .on("error", () => r(false))
      .end();
  });
}
