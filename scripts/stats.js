export function initStats() {
  return {
    ts: new Date().toISOString(),
    ok: 0,
    fail: 0,
    cdn: {},
    channels: {}
  };
}

export function logOK(stats, name, stream) {
  stats.ok++;
  stats.channels[name] = "ok";
  const host = new URL(stream).hostname;
  stats.cdn[host] = (stats.cdn[host] || 0) + 1;
}

export function logFail(stats, name) {
  stats.fail++;
  stats.channels[name] = "fail";
}
