// modules/handlers/gigotHandler.js
// EventBus → window.api.gigot.* bridge. Sibling of gitHandler.js.
// Unlike git, we pass the full {ok, data, error} envelope to the
// callback so the UI can distinguish "unreachable" from "unauthorized"
// from "repo not found" — the Test-connection button needs the error
// string verbatim.

import { EventBus } from "../eventBus.js";

function logIfFailed(where, res) {
  if (res && res.ok === false) {
    EventBus.emit("logging:warning", [
      `[GigotHandler] ${where} failed: ${res.error}`,
    ]);
  }
}

async function run(where, callback, fn) {
  try {
    const res = await fn();
    logIfFailed(where, res);
    callback?.(res);
  } catch (err) {
    const msg = String(err?.message || err);
    EventBus.emit("logging:error", [`[GigotHandler] ${where} threw: ${msg}`]);
    callback?.({ ok: false, error: msg });
  }
}

export async function handleGigotPing({ conn, callback }) {
  await run("ping", callback, () => window.api.gigot.gigotPing(conn));
}

export async function handleGigotStatus({ conn, callback }) {
  await run("status", callback, () => window.api.gigot.gigotStatus(conn));
}

export async function handleGigotListDestinations({ conn, callback }) {
  await run("listDestinations", callback, () =>
    window.api.gigot.gigotListDestinations(conn)
  );
}

export async function handleGigotSyncDestination({ conn, id, callback }) {
  await run("syncDestination", callback, () =>
    window.api.gigot.gigotSyncDestination(conn, id)
  );
}
