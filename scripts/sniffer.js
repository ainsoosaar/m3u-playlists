export function sniffM3U8(page, timeout = 15000) {
  return new Promise((resolve) => {
    let finished = false;
    const candidates = [];

    const onResponse = async (response) => {
      const url = response.url();
      if (!url.includes(".m3u8")) return;

      candidates.push(url);
    };

    const cleanup = () => {
      page.off("response", onResponse);
      clearTimeout(timer);
    };

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        resolve(selectBestM3U8(candidates));
      }
    }, timeout);

    page.on("response", onResponse);
  });
}

function selectBestM3U8(urls) {
  if (!urls.length) return null;

  // ❌ отбрасываем явные мусорные master
  const filtered = urls.filter(u =>
    !u.includes("0.m3u8") &&
    !u.includes("blank") &&
    !u.includes("ads")
  );

  // ✅ приоритет НЕ master
  const nonMaster = filtered.filter(u => !u.toLowerCase().includes("master"));

  return (nonMaster[0] || filtered[0] || urls[0]);
}
