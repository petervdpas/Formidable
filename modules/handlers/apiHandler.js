// modules/handlers/apiHandler.js
import { EventBus } from "../eventBus.js";

async function loadUserConfig() {
  return await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg || {}));
  });
}

async function getClient() {
  // Prefer Electron bridge
  if (window.api?.http?.get) {
    return {
      async get(path) {
        const res = await window.api.http.get(path);
        return res?.data ?? res;
      },
    };
  }
  // Fallback: localhost on configured port
  const cfg = await loadUserConfig();
  const port = Number(cfg?.internal_server_port) || 8383;
  const base = `http://localhost:${port}`;
  return {
    async get(path) {
      const url = path.startsWith("http") ? path : base + path;
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json().catch(() => ({}));
    },
  };
}

// GET /api/collections/:collection/:id
export async function handleApiGet({ collection, id }) {
  if (!collection || !id) {
    return { ok: false, error: "missing collection or id" };
  }
  try {
    const client = await getClient();
    const json = await client.get(
      `/api/collections/${encodeURIComponent(collection)}/${encodeURIComponent(
        id
      )}`
    );
    // normalize
    const data = json?.data || json || {};
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// GET /api/collections/:collection?limit&offset&include
export async function handleApiList({
  collection,
  limit = 50,
  offset = 0,
  include = "summary",
}) {
  if (!collection) return { ok: false, error: "missing collection" };
  try {
    const client = await getClient();
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      include: String(include),
    });
    const json = await client.get(
      `/api/collections/${encodeURIComponent(collection)}?${params}`
    );
    const data = json?.data || json || {};
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// GET /api/collections/design/:template
export async function handleApiDesign({ template }) {
  const collection = template || undefined;
  if (!collection) return { ok: false, error: "missing template" };
  try {
    const client = await getClient();
    const json = await client.get(
      `/api/collections/design/${encodeURIComponent(collection)}`
    );
    return { ok: true, data: json || {} };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}