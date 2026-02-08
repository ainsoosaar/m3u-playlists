import https from "https";

async function checkStreamHealth(m3u8Url) {
  const playlist = await fetchText(m3u8Url);
  if (!playlist) return false;

  const tsLine = playlist.split("\n").find(l => l.endsWith(".ts"));
  if (!tsLine) return false;

  const tsUrl = new URL(tsLine, m3u8Url).toString();
  return await headRequest(tsUrl);
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

function headRequest(url, timeout = 5000) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: "HEAD" }, res => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}
