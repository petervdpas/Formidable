// modules/handlers/gigotHandler.js
// EventBus → window.api.gigot.* bridge. Sibling of gitHandler.js.
// Passes the full {ok, data, error, load} envelope to the callback so
// the UI can distinguish error shapes verbatim.

import { EventBus } from "../eventBus.js";
import { Toast } from "../../utils/toastUtils.js";

let lastKnownLoad = null;

function logIfFailed(where, res) {
  if (res && res.ok === false) {
    EventBus.emit("logging:warning", [
      `[GigotHandler] ${where} failed: ${res.error}`,
    ]);
  }
}

function observeLoad(res) {
  if (!res || typeof res !== "object") return;
  const next = res.load;
  if (!next || next === lastKnownLoad) return;
  const previous = lastKnownLoad;
  lastKnownLoad = next;
  EventBus.emit("gigot:load:changed", [{ previous, current: next }]);
}

async function run(where, callback, fn) {
  try {
    const res = await fn();
    logIfFailed(where, res);
    observeLoad(res);
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

export async function handleGigotMe({ conn, callback }) {
  await run("me", callback, () => window.api.gigot.gigotMe(conn));
}

export async function handleGigotContext({ conn, callback }) {
  await run("context", callback, () => window.api.gigot.gigotContext(conn));
}

export async function handleGigotFormidable({ conn, callback }) {
  await run("formidable", callback, () =>
    window.api.gigot.gigotFormidable(conn)
  );
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

export async function handleGigotPushLocal({ conn, contextFolder, callback }) {
  await run("pushLocal", callback, () =>
    window.api.gigot.gigotPushLocal(conn, contextFolder)
  );
}

export async function handleGigotPullLocal({ conn, contextFolder, callback }) {
  await run("pullLocal", callback, () =>
    window.api.gigot.gigotPullLocal(conn, contextFolder)
  );
}

export async function handleGigotSyncLocal({
  conn,
  contextFolder,
  notify,
  callback,
}) {
  await run("syncLocal", callback, async () => {
    const res = await window.api.gigot.gigotSyncLocal(conn, contextFolder);
    if (notify) {
      if (res?.ok) {
        if (res.data?.noop) {
          Toast.success("toast.gigot.sync.uptodate");
        } else {
          const pushed = res.data?.pushed ?? 0;
          const pulled = res.data?.pulled ?? 0;
          Toast.success("toast.gigot.sync.complete", [pushed, pulled]);
        }
      } else if (res && res.ok === false) {
        Toast.error(res.error || "unknown");
      }
    }
    return res;
  });
}

export async function handleGigotLog({ conn, limit, callback }) {
  await run("log", callback, () =>
    window.api.gigot.gigotLog(conn, limit || 20)
  );
}

export async function handleGigotLastKnownLoad({ callback }) {
  await run("lastKnownLoad", callback, () =>
    window.api.gigot.gigotLastKnownLoad()
  );
}

export function getLastKnownLoad() {
  return lastKnownLoad;
}
