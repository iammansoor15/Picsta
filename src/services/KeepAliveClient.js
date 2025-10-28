// KeepAliveClient has been removed. This no-op implementation prevents any background pings.
function start() {
  return { started: false, reason: 'removed' };
}
function stop() {}
function updateInterval() {
  return { started: false, reason: 'removed' };
}
function getStatus() {
  return { running: false, intervalMinutes: 0, baseUrl: null };
}
export default { start, stop, updateInterval, getStatus };
