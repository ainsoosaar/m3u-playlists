export async function runPool(items, limit, handler) {
  const ret = [];
  const executing = [];

  for (const item of items) {
    const p = Promise.resolve().then(() => handler(item));
    ret.push(p);

    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}
