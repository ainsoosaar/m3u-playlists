export async function sniffM3U8(page, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let done = false;

    const onResponse = (response) => {
      const url = response.url();
      if (!done && url.includes(".m3u8")) {
        done = true;
        cleanup();
        resolve(url);
      }
    };

    const cleanup = () => {
      page.off("response", onResponse);
      clearTimeout(timer);
    };

    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        cleanup();
        resolve(null);
      }
    }, timeoutMs);

    page.on("response", onResponse);
  });
}
