export async function sniffM3U8(page) {
  const client = await page.target().createCDPSession();
  await client.send("Network.enable");

  const found = new Set();

  client.on("Network.requestWillBeSent", e => {
    const url = e.request.url;
    if (url.includes(".m3u8")) {
      found.add(url);
    }
  });

  // ⚠️ важно: дать странице "ожить"
  await page.waitForTimeout(12000);

  if (!found.size) return null;

  // фильтруем мусор
  const candidates = [...found].filter(u =>
    !u.includes("master") &&
    !u.includes("0.m3u8")
  );

  return candidates[0] || null;
}
