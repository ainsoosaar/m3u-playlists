export function initStats() {
  return {
    ts: new Date().toISOString(),
    ok: 0,
    fail: 0,
    channels: {}
  };
}

export function ok(stats, name, stream) {
  stats.ok++;
  stats.channels[name] = "ok";
}

export function fail(stats, name) {
  stats.fail++;
  stats.channels[name] = "fail";
}
