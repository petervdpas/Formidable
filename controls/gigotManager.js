// controls/gigotManager.js
// Backend for the GiGot remote-sync option. Sibling of gitManager.js.
// Talks to a GiGot server over HTTP using a subscription token.
// Stateless; caller passes a conn object built from the profile config.
const fs = require("fs");
const path = require("path");
const { error } = require("./nodeLogger");

function ok(data) {
  return { ok: true, data };
}
function fail(err) {
  const msg = typeof err === "string" ? err : err?.message || "Unknown error";
  return { ok: false, error: msg };
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
async function commitChanges(conn, { parentVersion, changes, message }) {
  const v = validateConn(conn);
  if (v) return fail(v);
  if (!parentVersion) return fail("Missing parent_version");
  if (!Array.isArray(changes) || changes.length === 0) {
    return fail("No changes to commit");
  }
  try {
    const data = await request(
      conn,
      "POST",
      `/api/repos/${encodeURIComponent(conn.repoName)}/commits`,
      {
        body: {
          parent_version: parentVersion,
          changes,
          message: message || "Formidable push",
        },
      }
    );
    return ok(data);
  } catch (err) {
    error("[GigotManager] commitChanges failed:", err);
    return fail(err);
  }
}

// Walk a Formidable context folder and build a changes[] array for
// POST /commits. Only collects templates/ (*.yaml) and storage/
// (**/*.meta.json, **/images/*). Skips .formidable/ (GiGot-owned) and
// any file outside those two subtrees.
function collectFormidableChanges(contextFolder) {
  const changes = [];
  const root = path.resolve(contextFolder);

  const templatesDir = path.join(root, "templates");
  if (fs.existsSync(templatesDir)) {
    for (const entry of fs.readdirSync(templatesDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".yaml")) continue;
      const abs = path.join(templatesDir, entry.name);
      changes.push(readAsChange(abs, `templates/${entry.name}`));
    }
  }

  const storageDir = path.join(root, "storage");
  if (fs.existsSync(storageDir)) {
    walkStorage(storageDir, "storage", changes);
  }

  return changes;
}

function walkStorage(absDir, relDir, changes) {
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) {
      walkStorage(abs, rel, changes);
    } else if (entry.isFile()) {
      // storage is free-form; accept .meta.json and images under images/
      // but also anything else the user has put there — GiGot will
      // receive the bytes and decide how to treat them server-side.
      changes.push(readAsChange(abs, rel));
    }
  }
}

function readAsChange(absPath, repoRelPath) {
  const buf = fs.readFileSync(absPath);
  return {
    op: "put",
    path: repoRelPath,
    content_b64: buf.toString("base64"),
  };
}

// Orchestrator: fetch HEAD, walk the context folder, push a single
// atomic commit with every Formidable file. One HTTP round-trip for
// HEAD + one for the commit, regardless of file count.
async function pushLocal(conn, contextFolder) {
  const v = validateConn(conn);
  if (v) return fail(v);
  if (!contextFolder) return fail("Missing context folder");

  let changes;
  try {
    changes = collectFormidableChanges(contextFolder);
  } catch (err) {
    error("[GigotManager] pushLocal walk failed:", err);
    return fail(err);
  }
  if (changes.length === 0) {
    return fail("No Formidable files found in context folder");
  }

  const headRes = await head(conn);
  if (!headRes.ok) return headRes;
  const parentVersion = headRes.data?.version;
  if (!parentVersion) {
    return fail("Remote repo has no HEAD (empty repo?)");
  }

  return await commitChanges(conn, {
    parentVersion,
    changes,
    message: `Formidable push (${changes.length} file${changes.length === 1 ? "" : "s"})`,
  });
}

module.exports = {
  ping,
  status,
  listDestinations,
  syncDestination,
  head,
  commitChanges,
  pushLocal,
};
