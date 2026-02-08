export async function sniffM3U8(page, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) resolve(null);
    }, timeoutMs);

    page.on("response", async (response) => {
      const url = response.url();

      if (!resolved && url.includes(".m3u8")) {
        resolved = true;
        clearTimeout(timer);
        resolve(url);
      }
    });
  });
}
