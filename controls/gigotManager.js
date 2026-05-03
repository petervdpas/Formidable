// controls/gigotManager.js
// Backend for the GiGot remote-sync option. Sibling of gitManager.js.
// Talks to a GiGot server over HTTP using a subscription token.
// Stateless; caller passes a conn object built from the profile config.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { error } = require("./nodeLogger");
const changes = require("./changes");
const apiClient = require("./apiClient");
const changeJournal = require("./changeJournal");

// Single source of truth for every GiGot endpoint Formidable hits.
// Path patterns use {placeholder}; gigotRequest() interpolates them.
// Adding a new endpoint = one row here + one wrapper function below.
const ROUTES = {
  health:          { method: "GET",  path: "/api/health" },
  me:              { method: "GET",  path: "/api/me" },
  context:         { method: "GET",  path: "/api/repos/{repo}/context" },
  formidable:      { method: "GET",  path: "/api/repos/{repo}/formidable" },
  head:            { method: "GET",  path: "/api/repos/{repo}/head" },
  tree:            { method: "GET",  path: "/api/repos/{repo}/tree" },
  file:            { method: "GET",  path: "/api/repos/{repo}/files/{filePath}" },
  log:             { method: "GET",  path: "/api/repos/{repo}/log" },
  commits:         { method: "POST", path: "/api/repos/{repo}/commits" },
  destinations:    { method: "GET",  path: "/api/repos/{repo}/destinations" },
  destinationSync: { method: "POST", path: "/api/repos/{repo}/destinations/{destId}/sync" },
};

// {filePath} is a `/`-separated repo-relative path whose slashes
// must reach the server intact; every other placeholder is a single
// segment that gets fully URI-encoded.
const MULTI_SEGMENT_PARAMS = ["filePath"];

function routePath(routeName, params = {}) {
  const route = ROUTES[routeName];
  if (!route) throw new Error(`Unknown GiGot route: ${routeName}`);
  return apiClient.interpolatePath(route.path, params, {
    multiSegment: MULTI_SEGMENT_PARAMS,
  });
}

// Thin wrapper around apiClient.request that bakes in GiGot's
// per-conn shape (baseUrl, token) and the X-GiGot-Load telemetry hook.
async function gigotRequest(conn, routeName, { params, body, query } = {}) {
  const route = ROUTES[routeName];
  if (!route) throw new Error(`Unknown GiGot route: ${routeName}`);
  return apiClient.request({
    baseUrl: conn.baseUrl,
    token: conn.token,
    method: route.method,
    path: routePath(routeName, params),
    body,
    query,
    onResponse: (res) => recordLoad(res.headers.get("X-GiGot-Load")),
  });
}

function ok(data) {
  const out = { ok: true, data };
  if (lastKnownLoad) out.load = lastKnownLoad;
  return out;
}
function fail(err) {
  const msg = typeof err === "string" ? err : err?.message || "Unknown error";
  const out = { ok: false, error: msg };
  if (err && typeof err === "object" && err.status) out.status = err.status;
  if (lastKnownLoad) out.load = lastKnownLoad;
  return out;
}

const LOAD_LEVELS = new Set(["low", "medium", "high"]);
let lastKnownLoad = null;

function recordLoad(headerValue) {
  if (!headerValue) return;
  const v = String(headerValue).trim().toLowerCase();
  if (LOAD_LEVELS.has(v)) lastKnownLoad = v;
}

function getLastKnownLoad() {
  return lastKnownLoad;
}

// Compute a file's git blob SHA1 — same hash git uses for tree entries.
// Lets us compare local bytes to remote tree entries without downloading
// remote content. Formula: SHA1("blob " + len + "\0" + content).
function gitBlobSha(buffer) {
  const header = `blob ${buffer.length}\0`;
  const h = crypto.createHash("sha1");
  h.update(header);
  h.update(buffer);
  return h.digest("hex");
}

// ─────────────────────────────────────────────────────────
// Track-record — double-ledger bookkeeping
//
// GiGot's refs/audit/main + commit log is the server-side ledger:
// tamper-evident, append-only, authoritative. This file is the
// client-side ledger: a per-context-folder snapshot of "what version
// did I last agree with the server on, and what was each file's blob
// SHA at that moment." Lets us compute accurate local diffs without
// re-fetching /tree every sync, survives Formidable restarts, and
// reconciles against the server's version on every push.
//
// Lives at <contextFolder>/.formidable/sync.json — the walker ignores
// .formidable/ so this never leaks to the remote. Each team member
// has their own local copy; it is deliberately *not* shared.
// ─────────────────────────────────────────────────────────

const TRACK_REL = ".formidable/sync.json";

function trackRecordPath(contextFolder) {
  return path.join(path.resolve(contextFolder), TRACK_REL);
}

function emptyTrackRecord() {
  return { version: null, lastSync: null, files: {} };
}

function readTrackRecord(contextFolder) {
  const p = trackRecordPath(contextFolder);
  if (!fs.existsSync(p)) return emptyTrackRecord();
  try {
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || null,
      lastSync: parsed.lastSync || null,
      files: parsed.files && typeof parsed.files === "object" ? parsed.files : {},
    };
  } catch (err) {
    // Corrupt or unreadable track-record — treat as empty so sync can
    // self-heal by re-seeding from /tree on the next operation.
    error("[GigotManager] readTrackRecord failed:", err);
    return emptyTrackRecord();
  }
}

function writeTrackRecord(contextFolder, record) {
  const p = trackRecordPath(contextFolder);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(record, null, 2));
  fs.renameSync(tmp, p);
}

// conn = { baseUrl, token, repoName }
function validateConn(conn, { requireRepo = true } = {}) {
  if (!conn || typeof conn !== "object") return "Missing connection";
  if (!conn.baseUrl) return "Missing base_url";
  if (!conn.token) return "Missing subscription token";
  if (requireRepo && !conn.repoName) return "Missing repo name";
  return null;
}

// GET /api/health — public on a vanilla GiGot, but deployments often
// front everything with edge auth (Cloudflare Access, oauth proxy)
// that 401s any token-less request. Forwarding the bearer when we
// have one is harmless on the unauthenticated case (server ignores
// it) and unblocks the gated case.
async function ping(conn) {
  const v = validateConn(conn, { requireRepo: false });
  if (v) return fail(v);
  try {
    const data = await gigotRequest(
      { baseUrl: conn.baseUrl, token: conn.token },
      "health"
    );
    return ok(data);
  } catch (err) {
    error("[GigotManager] ping failed:", err);
    return fail(err);
  }
}

// GET /api/me — bearer-aware self-introspection. Returns the
// caller's account (username, provider, role) plus the single
// subscription their token represents (repo + abilities[]). The
// repo-scoped /context covers the common per-repo bootstrap; /me
// is the repo-agnostic equivalent for callers that don't yet know
// which repo they're targeting (e.g. an account-picker UI).
async function me(conn) {
  const v = validateConn(conn, { requireRepo: false });
  if (v) return fail(v);
  try {
    const data = await gigotRequest(conn, "me");
    return ok(data);
  } catch (err) {
    error("[GigotManager] me failed:", err);
    return fail(err);
  }
}

// GET /api/repos/{name}/context — bootstrap for a repo connection.
// Single read returns {user, subscription, repo}: who am I, what
// can I do here, what does this repo offer (head, branch, empty
// flag, is_formidable, destinations summary). Renders the modal
// off this response with no inference from error codes.
async function context(conn) {
  const v = validateConn(conn);
  if (v) return fail(v);
  try {
    const data = await gigotRequest(conn, "context", {
      params: { repo: conn.repoName },
    });
    return ok(data);
  } catch (err) {
    error("[GigotManager] context failed:", err);
    return fail(err);
  }
}

// GET /api/repos/{name}/formidable — Formidable-shape bootstrap.
// Returns the scaffold marker (version + scaffolded_by + at), the
// templates list under templates/, and the storage layout
// (per-template file counts). Non-Formidable repos return 200 with
// marker_present=false and empty arrays so the client can
// distinguish "not Formidable" from "doesn't exist".
async function formidable(conn) {
  const v = validateConn(conn);
  if (v) return fail(v);
  try {
    const data = await gigotRequest(conn, "formidable", {
      params: { repo: conn.repoName },
    });
    return ok(data);
  } catch (err) {
    error("[GigotManager] formidable failed:", err);
    return fail(err);
  }
}

// GET /api/repos/{name}/destinations — mirror-sync targets attached
// to this repo. Each entry carries last_sync_status/at/error for the
// UI badges.
async function listDestinations(conn) {
  const v = validateConn(conn);
  if (v) return fail(v);
  try {
    const data = await gigotRequest(conn, "destinations", {
      params: { repo: conn.repoName },
    });
    return ok(data);
  } catch (err) {
    error("[GigotManager] listDestinations failed:", err);
    return fail(err);
  }
}

// POST /api/repos/{name}/destinations/{id}/sync — manual retry of a
// failed mirror push. Synchronous on the server; return payload
// carries the updated last_sync_* fields.
async function syncDestination(conn, destinationId) {
  const v = validateConn(conn);
  if (v) return fail(v);
  if (!destinationId) return fail("Missing destination id");
  try {
    const data = await gigotRequest(conn, "destinationSync", {
      params: { repo: conn.repoName, destId: destinationId },
    });
    return ok(data);
  } catch (err) {
    error("[GigotManager] syncDestination failed:", err);
    return fail(err);
  }
}

// GET /api/repos/{name}/head — returns { version, default_branch }.
// Used as parent_version for subsequent commits. Returns 409 if the
// repo exists but has no commits yet.
async function head(conn) {
  const v = validateConn(conn);
  if (v) return fail(v);
  try {
    const data = await gigotRequest(conn, "head", {
      params: { repo: conn.repoName },
    });
    return ok(data);
  } catch (err) {
    error("[GigotManager] head failed:", err);
    return fail(err);
  }
}

// POST /api/repos/{name}/commits — atomic multi-file commit.
// changes: [{ op: "put"|"delete", path, content_b64? }]
// When conn.author is populated, passes it through so git log shows
// the real team member instead of the subscription-key identity.
async function commitChanges(conn, { parentVersion, changes, message }) {
  const v = validateConn(conn);
  if (v) return fail(v);
  if (!parentVersion) return fail("Missing parent_version");
  if (!Array.isArray(changes) || changes.length === 0) {
    return fail("No changes to commit");
  }
  const body = {
    parent_version: parentVersion,
    changes,
    message: message || "Formidable push",
  };
  if (conn.author && conn.author.name && conn.author.email) {
    body.author = { name: conn.author.name, email: conn.author.email };
  }
  try {
    const data = await gigotRequest(conn, "commits", {
      params: { repo: conn.repoName },
      body,
    });
    return ok(data);
  } catch (err) {
    error("[GigotManager] commitChanges failed:", err);
    return fail(err);
  }
}

// GET /api/repos/{name}/log?limit=N — recent commits.
// Each entry: { hash, author, date, message }.
async function log(conn, limit = 20) {
  const v = validateConn(conn);
  if (v) return fail(v);
  try {
    const data = await gigotRequest(conn, "log", {
      params: { repo: conn.repoName },
      query: { limit },
    });
    return ok(data);
  } catch (err) {
    error("[GigotManager] log failed:", err);
    return fail(err);
  }
}

// Build a multi-line audit-friendly commit message: author header
// line followed by the changed paths as a bulleted list. Keeps the
// path list bounded so very large syncs don't produce unreadable
// messages.
function buildCommitMessage(conn, changes) {
  const who = conn.author?.name || "Formidable";
  const count = changes.length;
  const header = `${who}: sync ${count} file${count === 1 ? "" : "s"}`;
  const shown = changes.slice(0, 20);
  const body = shown
    .map((c) => `- ${c.op === "delete" ? "[delete] " : ""}${c.path}`)
    .join("\n");
  const tail =
    changes.length > shown.length
      ? `\n…and ${changes.length - shown.length} more`
      : "";
  return `${header}\n\n${body}${tail}`;
}

// Files Formidable manages at the repo root in addition to templates/
// and storage/. Seeded by the GiGot scaffolder; treated as first-class
// Formidable content for both push and pull so a fresh clone actually
// receives the README and .gitignore. Anything else at root (notes,
// IDE config, dotfiles) stays local-only.
const ROOT_FILE_ALLOWLIST = new Set(["README.md", ".gitignore"]);

// True iff a remote tree path belongs to Formidable's managed set:
// templates/, storage/, or one of the allowlisted root files. Used by
// pullLocal to filter the server's tree response.
function isFormidablePath(repoRelPath) {
  if (repoRelPath.startsWith("templates/")) return true;
  if (repoRelPath.startsWith("storage/")) return true;
  if (!repoRelPath.includes("/") && ROOT_FILE_ALLOWLIST.has(repoRelPath)) {
    return true;
  }
  return false;
}

// Walk a Formidable context folder and return every file under
// templates/ (*.yaml, non-recursive), storage/ (recursive), plus any
// allowlisted root files. Each entry carries the buffer + git blob SHA
// so callers can diff against the remote tree before deciding what to
// commit. Skips .formidable/ (GiGot-owned marker + local-only ledger)
// implicitly by only touching the listed locations.
function collectFormidableFiles(contextFolder) {
  const files = [];
  const root = path.resolve(contextFolder);

  const templatesDir = path.join(root, "templates");
  if (fs.existsSync(templatesDir)) {
    for (const entry of fs.readdirSync(templatesDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".yaml")) continue;
      const abs = path.join(templatesDir, entry.name);
      files.push(readFormidableFile(abs, `templates/${entry.name}`));
    }
  }

  const storageDir = path.join(root, "storage");
  if (fs.existsSync(storageDir)) {
    walkStorage(storageDir, "storage", files);
  }

  for (const name of ROOT_FILE_ALLOWLIST) {
    const abs = path.join(root, name);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      files.push(readFormidableFile(abs, name));
    }
  }

  return files;
}

function walkStorage(absDir, relDir, files) {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) {
      walkStorage(abs, rel, files);
    } else if (entry.isFile()) {
      files.push(readFormidableFile(abs, rel));
    }
  }
}

function readFormidableFile(absPath, repoRelPath) {
  const buf = fs.readFileSync(absPath);
  return {
    path: repoRelPath,
    buf,
    sha: gitBlobSha(buf),
  };
}

function fileToChange(f) {
  return {
    op: "put",
    path: f.path,
    content_b64: f.buf.toString("base64"),
  };
}

// Orchestrator: walk the local context folder, diff against the
// client-side track-record (double-ledger bookkeeping), and commit
// only files whose content differs from what the track-record says
// was last synced. Every commit in GiGot's audit trail represents a
// real content change.
//
// On first sync (empty track-record) we seed from the remote /tree
// so we don't blindly re-push files the remote already has. Steady
// state is /head + /commits only — no /tree fetch per push.
//
// The local folder is NOT assumed to be a git repo. Blob SHAs are
// computed from raw file bytes; nothing here needs git or a .git dir.
async function pushLocal(conn, contextFolder) {
  const v = validateConn(conn);
  if (v) return fail(v);
  if (!contextFolder) return fail("Missing context folder");

  // 1. Walk local files (templates/ + storage/), compute blob SHAs.
  let localFiles;
  try {
    localFiles = collectFormidableFiles(contextFolder);
  } catch (err) {
    error("[GigotManager] pushLocal walk failed:", err);
    return fail(err);
  }
  if (localFiles.length === 0) {
    return fail("No Formidable files found in context folder");
  }

  // 2. Load the client-side ledger. If empty, seed it from the remote
  //    /tree once — this covers first-time sync against an existing
  //    repo where we shouldn't blindly re-push everything.
  let record = readTrackRecord(contextFolder);
  const wasFirstSync = !record.version;
  if (wasFirstSync) {
    const treeRes = await tree(conn);
    if (treeRes.ok) {
      const seeded = emptyTrackRecord();
      seeded.version = treeRes.data?.version || null;
      for (const e of treeRes.data?.files || []) {
        seeded.files[e.path] = e.blob;
      }
      record = seeded;
    } else if (treeRes.status && treeRes.status !== 409) {
      return treeRes;
    }
    // 409 empty-repo → record stays empty → every local file counts.
  }

  // 3. Diff local against the ledger — both directions.
  //    Puts: local files whose SHA differs from the ledger.
  //    Deletes: managed paths the ledger remembers but no longer
  //    exist on disk. Skipped on the first sync because the freshly
  //    seeded ledger contains every server path, and any path we
  //    don't have locally yet belongs to pullLocal — not a delete.
  const changedFiles = localFiles.filter(
    (f) => record.files[f.path] !== f.sha
  );
  const localPaths = new Set(localFiles.map((f) => f.path));
  const deletedPaths = wasFirstSync
    ? []
    : Object.keys(record.files).filter(
        (p) => isFormidablePath(p) && !localPaths.has(p)
      );

  if (changedFiles.length === 0 && deletedPaths.length === 0) {
    // Persist any seeding we did above so the next push skips /tree.
    record.lastSync = new Date().toISOString();
    try {
      writeTrackRecord(contextFolder, record);
    } catch (err) {
      error("[GigotManager] writeTrackRecord failed:", err);
    }
    return ok({
      version: record.version || "",
      noop: true,
      pushed: 0,
      deleted: 0,
      scanned: localFiles.length,
    });
  }

  // 4. Fetch HEAD for parent_version and commit.
  const headRes = await head(conn);
  if (!headRes.ok) return headRes;
  const parentVersion = headRes.data?.version;
  if (!parentVersion) {
    return fail("Remote repo has no HEAD (empty repo?)");
  }

  const changes = [
    ...changedFiles.map(fileToChange),
    ...deletedPaths.map((p) => ({ op: "delete", path: p })),
  ];
  const commitRes = await commitChanges(conn, {
    parentVersion,
    changes,
    message: buildCommitMessage(conn, changes),
  });
  if (!commitRes.ok) return commitRes;

  // 5. Reconcile the ledger. The server is authoritative for both the
  //    new version and the post-commit blob SHA at each path — use the
  //    server's `changes[]` when present (handles F1 auto-merge where
  //    server-resolved content differs from what we sent). Fall back
  //    to our locally-computed SHAs for older GiGot versions that
  //    don't echo the change list back.
  record.version = commitRes.data?.version || parentVersion;
  record.lastSync = new Date().toISOString();
  const serverChanges = Array.isArray(commitRes.data?.changes)
    ? commitRes.data.changes
    : null;
  if (serverChanges) {
    for (const c of serverChanges) {
      if (!c?.path) continue;
      if (c.op === "deleted") {
        delete record.files[c.path];
      } else if (c.blob) {
        record.files[c.path] = c.blob;
      }
    }
  } else {
    for (const f of changedFiles) {
      record.files[f.path] = f.sha;
    }
    for (const p of deletedPaths) {
      delete record.files[p];
    }
  }
  try {
    writeTrackRecord(contextFolder, record);
  } catch (err) {
    error("[GigotManager] writeTrackRecord failed:", err);
  }

  return ok({
    ...commitRes.data,
    pushed: changedFiles.length,
    deleted: deletedPaths.length,
    noop: false,
  });
}

// GET /api/repos/{name}/tree — recursive file listing at HEAD.
async function tree(conn) {
  const v = validateConn(conn);
  if (v) return fail(v);
  try {
    const data = await gigotRequest(conn, "tree", {
      params: { repo: conn.repoName },
    });
    return ok(data);
  } catch (err) {
    error("[GigotManager] tree failed:", err);
    return fail(err);
  }
}

// GET /api/repos/{name}/files/{path} — one blob.
async function getFile(conn, repoRelPath) {
  const v = validateConn(conn);
  if (v) return fail(v);
  try {
    const data = await gigotRequest(conn, "file", {
      params: { repo: conn.repoName, filePath: repoRelPath },
    });
    return ok(data);
  } catch (err) {
    error("[GigotManager] getFile failed:", err);
    return fail(err);
  }
}

// Pull every Formidable file from remote into contextFolder. Overwrites
// local files under templates/ and storage/ with remote bytes. Does NOT
// delete local files that are absent from remote (reserved for a future
// reconciliation pass — safer default for a team tool).
//
// After a successful pull, the client-side ledger is rebuilt from the
// server's tree response. The server is authoritative for what's in
// the repo at this version, so we replace the record wholesale rather
// than merging — any local drift is resolved in favor of the server.
async function pullLocal(conn, contextFolder) {
  const v = validateConn(conn);
  if (v) return fail(v);
  if (!contextFolder) return fail("Missing context folder");

  // Snapshot the prior ledger before fetching — used to compute
  // server-side deletes (managed paths the ledger remembers but the
  // new tree no longer lists). Files that were never in the ledger
  // (brand-new local work) are preserved by this gate.
  const oldRecord = readTrackRecord(contextFolder);

  const treeRes = await tree(conn);
  if (!treeRes.ok) return treeRes;

  const allFiles = Array.isArray(treeRes.data?.files) ? treeRes.data.files : [];
  const formidableFiles = allFiles.filter((f) => isFormidablePath(f.path));
  const newTreePaths = new Set(allFiles.map((f) => f.path));

  // Apply server-side deletes locally. Best-effort: we log and
  // continue on per-file errors so one stuck file doesn't abort the
  // whole pull.
  let deleted = 0;
  for (const oldPath of Object.keys(oldRecord.files)) {
    if (!isFormidablePath(oldPath)) continue;
    if (newTreePaths.has(oldPath)) continue;
    const abs = path.join(contextFolder, oldPath);
    try {
      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs);
        deleted += 1;
      }
    } catch (err) {
      error("[GigotManager] pullLocal delete failed:", oldPath, err);
    }
  }

  let written = 0;
  for (const entry of formidableFiles) {
    const abs = path.join(contextFolder, entry.path);
    // Cheap short-circuit: if the local file already hashes to the
    // server's blob SHA, the bytes match exactly and there's nothing
    // to fetch. Without this, every sync re-downloads every managed
    // file and the "↓N" toast is misleadingly large for noop pulls.
    if (fs.existsSync(abs)) {
      try {
        const localBuf = fs.readFileSync(abs);
        if (gitBlobSha(localBuf) === entry.blob) continue;
      } catch (err) {
        // Read failure → fall through, treat as "needs refresh".
        error("[GigotManager] pullLocal local-read failed:", entry.path, err);
      }
    }
    const blobRes = await getFile(conn, entry.path);
    if (!blobRes.ok) return blobRes;
    const b64 = blobRes.data?.content_b64 || "";
    const buf = Buffer.from(b64, "base64");
    try {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const tmp = `${abs}.tmp-${process.pid}-${Date.now()}`;
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, abs);
      written += 1;
    } catch (err) {
      return fail(`write failed for ${entry.path}: ${err.message}`);
    }
  }

  // Rebuild the ledger from the authoritative tree — includes both
  // templates/+storage/ entries we just wrote and any .formidable/*
  // tree entries so drift detection works for the whole repo.
  const record = emptyTrackRecord();
  record.version = treeRes.data?.version || null;
  record.lastSync = new Date().toISOString();
  for (const e of allFiles) {
    record.files[e.path] = e.blob;
  }
  try {
    writeTrackRecord(contextFolder, record);
  } catch (err) {
    error("[GigotManager] writeTrackRecord failed:", err);
  }

  return ok({
    version: treeRes.data?.version || "",
    files: written,
    deleted,
  });
}

// One-button sync: push local → pull merged state. On push 409 we
// deliberately skip the pull to preserve the user's unpushed local
// changes so they can resolve the conflict manually.
async function sync(conn, contextFolder) {
  const v = validateConn(conn);
  if (v) return fail(v);
  if (!contextFolder) return fail("Missing context folder");

  const pushRes = await pushLocal(conn, contextFolder);
  if (!pushRes.ok) {
    return { ok: false, error: pushRes.error, stage: "push" };
  }

  const pullRes = await pullLocal(conn, contextFolder);
  if (!pullRes.ok) {
    return { ok: false, error: pullRes.error, stage: "pull" };
  }

  const pushedCount = pushRes.data?.pushed ?? 0;
  const pushedDeleted = pushRes.data?.deleted ?? 0;
  const pulledCount = pullRes.data?.files ?? 0;
  const pulledDeleted = pullRes.data?.deleted ?? 0;
  const version = pullRes.data?.version || pushRes.data?.version || "";
  const isNoop =
    pushedCount === 0 &&
    pushedDeleted === 0 &&
    pulledCount === 0 &&
    pulledDeleted === 0;
  // Only mark a sync in the journal when something actually moved.
  // Noops would clutter the log with one entry per auto-poller tick.
  if (!isNoop) {
    changeJournal.recordSync({
      backend: "gigot",
      version,
      pushed: pushedCount + pushedDeleted,
      pulled: pulledCount + pulledDeleted,
    });
  }
  changes.reset();
  return ok({
    version,
    pushed: pushedCount,
    pushedDeleted,
    pulled: pulledCount,
    pulledDeleted,
    noop:
      pushedCount === 0 &&
      pushedDeleted === 0 &&
      pulledCount === 0 &&
      pulledDeleted === 0,
  });
}


module.exports = {
  ping,
  me,
  context,
  formidable,
  listDestinations,
  syncDestination,
  head,
  commitChanges,
  pushLocal,
  tree,
  getFile,
  pullLocal,
  sync,
  log,
  getLastKnownLoad,
};
