import https from "https";

export async function isValidM3U8(url) {
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

export async function selectBest(urls) {
  for (const u of urls) {
    if (await isValidM3U8(u)) return u;
  }
  return null;
}
