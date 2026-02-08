export function sniffM3U8(page, timeout = 15000) {
  return new Promise((resolve) => {
    let finished = false;

    const onResponse = (response) => {
      const url = response.url();
      if (!finished && url.includes(".m3u8")) {
        finished = true;
        cleanup();
        resolve(url);
      }
    };

    const cleanup = () => {
      page.off("response", onResponse);
      clearTimeout(timer);
    };

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        resolve(null);
      }
    }, timeout);

    page.on("response", onResponse);
  });
}
