// controls/gigotManager.js
// Backend for the GiGot remote-sync option. Sibling of gitManager.js.
// Talks to a GiGot server over HTTP using a subscription token.
// Stateless; caller passes a conn object built from the profile config.
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

module.exports = {
  ping,
  status,
  listDestinations,
  syncDestination,
};
