// controls/changes.js
// Counter of unsaved changes since the last commit/sync. Persisted
// in config/boot.json under `pending_changes`. Backend-agnostic:
// the renderer decides when to bump (any save) and when to reset
// (git commit or gigot repo sync; mirror sync does NOT reset since
// it's a server-side mirror push, not a local-changes flush).

const fileManager = require("./fileManager");

function bootPath() {
  return fileManager.resolvePath("config", "boot.json");
}

function readBoot() {
  try {
    return (
      fileManager.loadFile(bootPath(), { format: "json", silent: true }) || {}
    );
  } catch {
    return {};
  }
}

function writePending(value) {
  const boot = readBoot();
  boot.pending_changes = value;
  fileManager.saveFile(bootPath(), boot, { format: "json", silent: true });
}

function bump() {
  const boot = readBoot();
  const next =
    (typeof boot.pending_changes === "number" ? boot.pending_changes : 0) + 1;
  writePending(next);
  return next;
}

function get() {
  const boot = readBoot();
  return typeof boot.pending_changes === "number" ? boot.pending_changes : 0;
}

function reset() {
  writePending(0);
  return 0;
}

module.exports = { bump, get, reset };
