// controls/changeJournal.js

const fs = require("fs");
const path = require("path");
const { warn, error } = require("./nodeLogger");
const schema = require("../schemas/changes.schema");

const JOURNAL_FILE = ".changes.log";
const CURSOR_FILE = ".changes.cursor";
const GITIGNORE_PATTERNS = [
  "*.log",
  "**/*.log",
  ".changes.*",
  "**/.changes.*",
];

let currentContextFolder = "";
let currentBackend = "";

function configure({ contextFolder, backend } = {}) {
  currentContextFolder = (contextFolder || "").trim();
  currentBackend = (backend || "").trim().toLowerCase();
  ensureGitignorePatterns();
  ensureCursorFile();
}

// Create an empty cursor file the first time we see a context, so
// the file exists alongside .changes.log from the start. Empty {}
// = "no backend has synced yet" — readCursor() returns {} either
// way, but having the file present is more honest about state.
function ensureCursorFile() {
  if (!currentContextFolder) return;
  const cursorPath = path.join(currentContextFolder, CURSOR_FILE);
  if (fs.existsSync(cursorPath)) return;
  try {
    fs.writeFileSync(cursorPath, "{}\n", "utf-8");
  } catch (err) {
    error("[ChangeJournal] cursor seed failed:", err);
  }
}

// Walk up from startDir looking for a directory that contains a
// `.git` entry (either the standard repo dir or a worktree pointer
// file). Returns the absolute path of that directory, or null if
// none found within MAX_DEPTH levels.
function findGitRepoRoot(startDir) {
  const MAX_DEPTH = 10;
  let dir = path.resolve(startDir);
  for (let i = 0; i < MAX_DEPTH; i++) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

// Ensure a .gitignore excludes log files. Skipped for local-only
// contexts — version control isn't in play, no point touching the
// filesystem. For git/gigot backends, prefers the context folder's
// own .gitignore; otherwise walks up to find the enclosing git repo
// root and patches that one (handles dev setups where the context
// is a subdirectory of a larger repo). If neither the context nor
// any ancestor has git, bails — backend is configured but git was
// never actually initialised, so creating a gitignore would be
// presumptuous. Patches in both `*.log` (root) and `**/*.log` (any
// subdirectory) so the per-machine journal never reaches a
// teammate's clone, no matter where it lands.
function ensureGitignorePatterns() {
  if (!currentContextFolder) return;
  if (!currentBackend || currentBackend === "none") return;

  let gitignorePath;
  const contextGitignore = path.join(currentContextFolder, ".gitignore");
  if (fs.existsSync(contextGitignore)) {
    gitignorePath = contextGitignore;
  } else {
    const repoRoot = findGitRepoRoot(currentContextFolder);
    if (!repoRoot) return;
    gitignorePath = path.join(repoRoot, ".gitignore");
  }

  let body = "";
  if (fs.existsSync(gitignorePath)) {
    try {
      body = fs.readFileSync(gitignorePath, "utf-8");
    } catch (err) {
      error("[ChangeJournal] gitignore read failed:", err);
      return;
    }
  }
  const present = new Set(body.split(/\r?\n/).map((l) => l.trim()));
  const missing = GITIGNORE_PATTERNS.filter((p) => !present.has(p));
  if (missing.length === 0) return;
  const sep = body.length === 0 || body.endsWith("\n") ? "" : "\n";
  try {
    fs.appendFileSync(gitignorePath, sep + missing.join("\n") + "\n", "utf-8");
  } catch (err) {
    error("[ChangeJournal] gitignore write failed:", err);
  }
}

function isTrackedRel(rel) {
  return (
    rel === "templates" ||
    rel.startsWith("templates/") ||
    rel === "storage" ||
    rel.startsWith("storage/")
  );
}

function toRelativePosix(absPath) {
  if (!currentContextFolder) return null;
  const rel = path.relative(
    path.resolve(currentContextFolder),
    path.resolve(absPath)
  );
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

function recordOp(op, absPath, { bytes } = {}) {
  const rel = toRelativePosix(absPath);
  if (!rel || !isTrackedRel(rel)) return;

  const entry = { ts: new Date().toISOString(), op, path: rel };
  if (bytes != null) entry.bytes = bytes;

  appendEntry(entry);
}

// Append a sync-completion marker. Reading the journal back, every
// entry whose ts is older than the latest sync marker is considered
// "on the remote" (backend = git or gigot); entries newer than the
// last sync marker are still local. Append-only; never rewrites past
// entries.
function recordSync({ backend, version, pushed, pulled } = {}) {
  if (!currentContextFolder) {
    warn("[ChangeJournal] recordSync skipped: no current context folder");
    return;
  }
  if (!backend) {
    warn("[ChangeJournal] recordSync skipped: no backend");
    return;
  }
  const ts = new Date().toISOString();
  const entry = { ts, op: "sync", backend };
  if (version) entry.version = version;
  if (typeof pushed === "number") entry.pushed = pushed;
  if (typeof pulled === "number") entry.pulled = pulled;
  appendEntry(entry);
  updateCursor(backend, { ts, version });
}

// Update the per-backend version pointer without advancing the sync
// ts. Called after a successful pull — we now know the server's HEAD,
// but no new sync marker is appended (the journal records *outbound*
// state changes; pull is inbound). Keeping ts and version writers
// distinct preserves the "one funnel per backend for sync markers"
// rule while letting the head-probe poller compare cheaply.
function recordRemoteSeen(backend, version) {
  if (!currentContextFolder) return;
  if (!backend || !version) return;
  updateCursor(backend, { version });
}

// Cursor file — tiny JSON keyed by backend, holds the ts of the
// latest sync marker per backend. Derived state: rebuildable by
// scanning the journal. Kept as a separate file so the "where did
// I leave off?" lookup is O(1) and doesn't require parsing the log.
// Compute pending changes since the last sync for the active backend.
// Reads the journal, dedupes by path (latest op wins), skips sync
// markers and baseline entries (the latter are "was here at init",
// not user changes). Returns {count, paths:[{path, op}]} for pollers
// + UI to consume. Local-only / no-context returns empty.
function pending() {
  if (!currentContextFolder) return { count: 0, paths: [] };
  if (!currentBackend || currentBackend === "none") {
    return { count: 0, paths: [] };
  }
  const journalPath = path.join(currentContextFolder, JOURNAL_FILE);
  if (!fs.existsSync(journalPath)) return { count: 0, paths: [] };

  const cursorTs = (readCursor()[currentBackend] || {}).ts || "";
  const pathOps = new Map();
  let body;
  try {
    body = fs.readFileSync(journalPath, "utf-8");
  } catch (err) {
    warn("[ChangeJournal] pending read failed:", err?.message || err);
    return { count: 0, paths: [] };
  }
  for (const line of body.split("\n")) {
    const entry = schema.parseLine(line);
    if (!entry) continue;
    if (entry.ts <= cursorTs) continue;
    if (entry.op === "sync" || entry.op === "baseline") continue;
    pathOps.set(entry.path, entry.op);
  }
  return {
    count: pathOps.size,
    paths: Array.from(pathOps, ([path, op]) => ({ path, op })),
  };
}

function readCursor() {
  if (!currentContextFolder) return {};
  const cursorPath = path.join(currentContextFolder, CURSOR_FILE);
  if (!fs.existsSync(cursorPath)) return {};
  let raw;
  try {
    const text = fs.readFileSync(cursorPath, "utf-8");
    raw = JSON.parse(text);
  } catch (err) {
    warn("[ChangeJournal] cursor read failed:", err?.message || err);
    return {};
  }
  const { cursor } = schema.sanitizeCursor(raw);
  return cursor;
}

// Merge-write the per-backend cursor entry. Caller passes only the
// fields it owns (ts from sync, version from pull or sync), other
// fields preserved. Atomic via tmp+rename.
function updateCursor(backend, fields) {
  if (!currentContextFolder) return;
  const cursorPath = path.join(currentContextFolder, CURSOR_FILE);
  const cursor = readCursor();
  const prev = cursor[backend] || { ts: "", version: "" };
  cursor[backend] = {
    ts: typeof fields.ts === "string" ? fields.ts : prev.ts,
    version:
      typeof fields.version === "string" ? fields.version : prev.version,
  };
  try {
    const tmp = `${cursorPath}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(cursor) + "\n", "utf-8");
    fs.renameSync(tmp, cursorPath);
  } catch (err) {
    error("[ChangeJournal] cursor write failed:", err);
  }
}

function appendEntry(entry) {
  const journalPath = path.join(currentContextFolder, JOURNAL_FILE);
  try {
    fs.appendFileSync(journalPath, JSON.stringify(entry) + "\n", "utf-8");
  } catch (err) {
    error("[ChangeJournal] append failed:", err);
  }
}

function walkInto(absDir, relDir, out) {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    const rel = relDir + "/" + entry.name;
    if (entry.isDirectory()) walkInto(abs, rel, out);
    else if (entry.isFile()) out.push(rel);
  }
}

function collectTrackedFiles() {
  const out = [];
  const tplDir = path.join(currentContextFolder, "templates");
  if (fs.existsSync(tplDir)) {
    for (const entry of fs.readdirSync(tplDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".yaml")) {
        out.push("templates/" + entry.name);
      }
    }
  }
  const storageDir = path.join(currentContextFolder, "storage");
  if (fs.existsSync(storageDir)) walkInto(storageDir, "storage", out);
  return out;
}

// One-shot baseline: walks the existing templates/ + storage/ tree
// and writes a `baseline` entry per file. Skipped if the log already
// exists (so re-running is safe). The "baseline" op is distinct from
// "create" so consumers can tell "was here at init time" apart from
// "user created this in-app".
function init() {
  if (!currentContextFolder) return { created: false, reason: "no-context" };
  const journalPath = path.join(currentContextFolder, JOURNAL_FILE);
  if (fs.existsSync(journalPath)) {
    return { created: false, reason: "exists" };
  }
  const files = collectTrackedFiles();
  if (files.length === 0) {
    return { created: false, reason: "empty" };
  }
  const ts = new Date().toISOString();
  const lines = files.map((rel) => {
    const abs = path.join(currentContextFolder, rel);
    let bytes;
    try {
      bytes = fs.statSync(abs).size;
    } catch (_) {}
    const entry = { ts, op: "baseline", path: rel };
    if (bytes != null) entry.bytes = bytes;
    return JSON.stringify(entry);
  });
  try {
    fs.writeFileSync(journalPath, lines.join("\n") + "\n", "utf-8");
    return { created: true, entries: lines.length };
  } catch (err) {
    error("[ChangeJournal] init failed:", err);
    return { created: false, reason: err.message };
  }
}

module.exports = {
  configure,
  recordOp,
  recordSync,
  recordRemoteSeen,
  readCursor,
  pending,
  init,
};
