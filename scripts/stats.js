export function initStats() {
  return {
    ts: new Date().toISOString(),
    ok: 0,
    fail: 0,
    cdn: {},
    channels: {}
  };
}

export function ok(stats, name, stream) {
  stats.ok++;
  stats.channels[name] = "ok";
  const h = new URL(stream).hostname;
  stats.cdn[h] = (stats.cdn[h] || 0) + 1;
}

export function fail(stats, name) {
  stats.fail++;
  stats.channels[name] = "fail";
}
