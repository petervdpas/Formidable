// controls/apiClient.js
// Generic JSON-over-HTTP client used by main-process service modules
// (e.g. gigotManager). Handles bearer auth, JSON body/response,
// transparent single-shot 429 retry honoring Retry-After, and error
// normalization. Service-specific concerns (custom headers, telemetry)
// hook in via the onResponse callback so this stays generic.

const DEFAULT_MAX_RETRY_AFTER_MS = 30 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(headerValue) {
  if (!headerValue) return null;
  const n = parseInt(String(headerValue).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n * 1000;
}

function buildUrl(baseUrl, pathname, query) {
  const url = new URL(pathname, baseUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
  }
  return url;
}

async function request({
  baseUrl,
  token,
  method,
  path,
  body,
  query,
  headers,
  onResponse,
  maxRetryAfterMs = DEFAULT_MAX_RETRY_AFTER_MS,
}) {
  if (!baseUrl) throw new Error("apiClient: missing baseUrl");
  if (!method) throw new Error("apiClient: missing method");
  if (!path) throw new Error("apiClient: missing path");

  const url = buildUrl(baseUrl, path, query);
  const init = {
    method,
    headers: {
      Accept: "application/json",
      ...(headers || {}),
    },
  };
  if (token) {
    init.headers.Authorization = `Bearer ${token}`;
  }
  if (body != null) {
    init.headers["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  let res;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(url, init);
    if (typeof onResponse === "function") {
      try {
        onResponse(res);
      } catch {
        // onResponse is for telemetry/header-sniffing; never let it
        // mask the underlying response.
      }
    }
    if (res.status !== 429 || attempt === 1) break;
    const retryMs = parseRetryAfter(res.headers.get("Retry-After"));
    if (retryMs == null || retryMs > maxRetryAfterMs) break;
    await sleep(retryMs);
  }

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

module.exports = { request };
