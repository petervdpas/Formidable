// controls/changeJournal.js

const fs = require("fs");
const path = require("path");
const { error } = require("./nodeLogger");

const JOURNAL_FILE = ".changes.log";
const LOG_PATTERNS = ["*.log", "**/*.log"];

let currentContextFolder = "";
let currentActor = "";
let currentBackend = "";

function configure({ contextFolder, actor, backend } = {}) {
  currentContextFolder = (contextFolder || "").trim();
  currentActor = (actor || "").trim();
  currentBackend = (backend || "").trim().toLowerCase();
  ensureGitignorePatterns();
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
  const missing = LOG_PATTERNS.filter((p) => !present.has(p));
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
  if (currentActor) entry.actor = currentActor;

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
    if (currentActor) entry.actor = currentActor;
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

module.exports = { configure, recordOp, init };
