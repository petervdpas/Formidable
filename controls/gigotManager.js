// controls/gigotManager.js
// Backend for the GiGot remote-sync option. Sibling of gitManager.js.
// Talks to a GiGot server over HTTP using a subscription token.
// Stateless; caller passes a conn object built from the profile config.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { error } = require("./nodeLogger");

function ok(data) {
  return { ok: true, data };
}
function fail(err) {
  const msg = typeof err === "string" ? err : err?.message || "Unknown error";
  const out = { ok: false, error: msg };
  if (err && typeof err === "object" && err.status) out.status = err.status;
  return out;
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

async function request(conn, method, pathname, { body, query } = {}) {
  const url = new URL(pathname, conn.baseUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
  }
  const init = {
    method,
    headers: {
      Accept: "application/json",
    },
  };
  if (conn.token) {
    init.headers.Authorization = `Bearer ${conn.token}`;
  }
  if (body != null) {
    init.headers["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && data.error) ||
      `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// GET /api/health — public, no token required. Use to verify base URL
// before a full status call so the user sees a clean "unreachable" vs
// "unauthorized" distinction.
async function ping(conn) {
  const v = validateConn(conn, { requireRepo: false });
  if (v) return fail(v);
  try {
    const data = await request({ baseUrl: conn.baseUrl }, "GET", "/api/health");
    return ok(data);
  } catch (err) {
    error("[GigotManager] ping failed:", err);
    return fail(err);
  }
}

// GET /api/repos/{name} — requires token + in-scope repo. Returns
// repo info including destination count, head sha, etc.
async function status(conn) {
  const v = validateConn(conn);
  if (v) return fail(v);
  try {
    const data = await request(
      conn,
      "GET",
      `/api/repos/${encodeURIComponent(conn.repoName)}`
    );
    return ok(data);
  } catch (err) {
    error("[GigotManager] status failed:", err);
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
    const data = await request(
      conn,
      "GET",
      `/api/repos/${encodeURIComponent(conn.repoName)}/destinations`
    );
    return ok(data);
  } catch (err) {
    error("[GigotManager] listDestinations failed:", err);
    return fail(err);
  }
}

// POST /api/repos/{name}/destinations — register a new mirror target.
// body: { url, credential_name, enabled }. credential_name must
// resolve against the GiGot credential vault (a PAT for the mirror
// remote). Returns the created DestinationView.
async function createDestination(conn, body) {
  const v = validateConn(conn);
  if (v) return fail(v);
  if (!body || !body.url) return fail("Missing destination url");
  if (!body.credential_name) return fail("Missing credential_name");
  try {
    const data = await request(
      conn,
      "POST",
      `/api/repos/${encodeURIComponent(conn.repoName)}/destinations`,
      { body }
    );
    return ok(data);
  } catch (err) {
    error("[GigotManager] createDestination failed:", err);
    return fail(err);
  }
}

// PATCH /api/repos/{name}/destinations/{id} — partial update. Mutable
// server-side fields are `enabled` and `credential_name`; URL is
// immutable (delete + recreate to change it).
async function updateDestination(conn, destinationId, body) {
  const v = validateConn(conn);
  if (v) return fail(v);
  if (!destinationId) return fail("Missing destination id");
  try {
    const data = await request(
      conn,
      "PATCH",
      `/api/repos/${encodeURIComponent(conn.repoName)}/destinations/${encodeURIComponent(destinationId)}`,
      { body: body || {} }
    );
    return ok(data);
  } catch (err) {
    error("[GigotManager] updateDestination failed:", err);
    return fail(err);
  }
}

// DELETE /api/repos/{name}/destinations/{id} — drop a mirror target.
// 204 on success → null data; UI just refreshes the list.
async function deleteDestination(conn, destinationId) {
  const v = validateConn(conn);
  if (v) return fail(v);
  if (!destinationId) return fail("Missing destination id");
  try {
    const data = await request(
      conn,
      "DELETE",
      `/api/repos/${encodeURIComponent(conn.repoName)}/destinations/${encodeURIComponent(destinationId)}`
    );
    return ok(data);
  } catch (err) {
    error("[GigotManager] deleteDestination failed:", err);
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
    const data = await request(
      conn,
      "POST",
      `/api/repos/${encodeURIComponent(conn.repoName)}/destinations/${encodeURIComponent(destinationId)}/sync`
    );
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
    const data = await request(
      conn,
      "GET",
      `/api/repos/${encodeURIComponent(conn.repoName)}/head`
    );
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
    const data = await request(
      conn,
      "POST",
      `/api/repos/${encodeURIComponent(conn.repoName)}/commits`,
      { body }
    );
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
    const data = await request(
      conn,
      "GET",
      `/api/repos/${encodeURIComponent(conn.repoName)}/log`,
      { query: { limit } }
    );
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
  const body = shown.map((c) => `- ${c.path}`).join("\n");
  const tail =
    changes.length > shown.length
      ? `\n…and ${changes.length - shown.length} more`
      : "";
  return `${header}\n\n${body}${tail}`;
}

// Walk a Formidable context folder and return every file under
// templates/ (*.yaml, non-recursive) and storage/ (recursive). Each
// entry carries the buffer + git blob SHA so callers can diff against
// the remote tree before deciding what to commit. Skips .formidable/
// (GiGot-owned marker) implicitly by only descending templates + storage.
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
  if (!record.version) {
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

  // 3. Diff local against the ledger.
  const changedFiles = localFiles.filter(
    (f) => record.files[f.path] !== f.sha
  );

  if (changedFiles.length === 0) {
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

  const changes = changedFiles.map(fileToChange);
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
  }
  try {
    writeTrackRecord(contextFolder, record);
  } catch (err) {
    error("[GigotManager] writeTrackRecord failed:", err);
  }

  return ok({ ...commitRes.data, pushed: changedFiles.length, noop: false });
}

// GET /api/repos/{name}/tree — recursive file listing at HEAD.
async function tree(conn) {
  const v = validateConn(conn);
  if (v) return fail(v);
  try {
    const data = await request(
      conn,
      "GET",
      `/api/repos/${encodeURIComponent(conn.repoName)}/tree`
    );
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
    const data = await request(
      conn,
      "GET",
      `/api/repos/${encodeURIComponent(conn.repoName)}/files/${encodeFilePath(repoRelPath)}`
    );
    return ok(data);
  } catch (err) {
    error("[GigotManager] getFile failed:", err);
    return fail(err);
  }
}

function encodeFilePath(repoRelPath) {
  // The server accepts the path as-is after /files/; each segment
  // URI-encoded individually preserves directory slashes.
  return repoRelPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
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

  const treeRes = await tree(conn);
  if (!treeRes.ok) return treeRes;

  const allFiles = Array.isArray(treeRes.data?.files) ? treeRes.data.files : [];
  const formidableFiles = allFiles.filter(
    (f) =>
      f.path.startsWith("templates/") || f.path.startsWith("storage/")
  );

  let written = 0;
  for (const entry of formidableFiles) {
    const blobRes = await getFile(conn, entry.path);
    if (!blobRes.ok) return blobRes;
    const b64 = blobRes.data?.content_b64 || "";
    const buf = Buffer.from(b64, "base64");
    const abs = path.join(contextFolder, entry.path);
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
  const pulledCount = pullRes.data?.files ?? 0;
  return ok({
    version: pullRes.data?.version || pushRes.data?.version || "",
    pushed: pushedCount,
    pulled: pulledCount,
    noop: pushedCount === 0 && pulledCount === 0,
  });
}

module.exports = {
  ping,
  status,
  listDestinations,
  createDestination,
  updateDestination,
  deleteDestination,
  syncDestination,
  head,
  commitChanges,
  pushLocal,
  tree,
  getFile,
  pullLocal,
  sync,
  log,
};
