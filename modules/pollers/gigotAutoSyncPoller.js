// modules/pollers/gigotAutoSyncPoller.js

import { EventBus } from "../eventBus.js";
import { reloadUserConfig } from "../../utils/configUtil.js";
import { resolveGigotConn } from "../../utils/backendUtils.js";

const POLLER_ID = "gigot:auto-sync";
const INTERVAL_FOREGROUND_MS = 5 * 60 * 1000;
const INTERVAL_HIDDEN_MS = 15 * 60 * 1000;

function emitAsync(event, payload) {
  return new Promise((resolve) =>
    EventBus.emit(event, { ...payload, callback: resolve })
  );
}

export async function startGigotAutoSyncPoller() {
  const cfg = await reloadUserConfig();
  if (cfg?.remote_backend !== "gigot") return;

  const conn = resolveGigotConn(cfg);
  if (!conn?.baseUrl || !conn?.token || !conn?.repoName) return;

  const contextFolder = cfg?.context_folder || "";
  if (!contextFolder) return;

  EventBus.emit("tasks:unregister", POLLER_ID);
  EventBus.emit("tasks:register", {
    id: POLLER_ID,
    interval: INTERVAL_FOREGROUND_MS,
    intervalHidden: INTERVAL_HIDDEN_MS,
    jitterPct: 0.1,
    immediate: true,
    pauseWhenHidden: true,
    backoff: { strategy: "exponential", factor: 2, max: 30 * 60 * 1000 },
    // Per-tick decision tree:
    //   1. Local has pending changes  → push+pull (sync-local, notify).
    //   2. Server HEAD moved past our cursor → pull-only (notify).
    //   3. Both quiet → silent return.
    // The head probe is a single git lookup server-side, cheap enough
    // to run every 5 min foreground / 15 min hidden. Avoids the prior
    // blind spot where idle clients never noticed teammate pushes.
    fn: async () => {
      try {
        const pendingRes = await emitAsync("journal:pending", {});
        const hasLocal =
          pendingRes?.ok && (pendingRes.data?.count ?? 0) > 0;

        if (hasLocal) {
          await emitAsync("gigot:sync-local", {
            conn,
            contextFolder,
            notify: true,
          });
          return;
        }

        const headRes = await emitAsync("gigot:head", { conn });
        const serverVersion = headRes?.ok ? headRes.data?.version || "" : "";
        if (!serverVersion) return;

        const cursorRes = await emitAsync("journal:cursor", {});
        const cursorVersion =
          (cursorRes?.ok && cursorRes.data?.gigot?.version) || "";

        if (serverVersion === cursorVersion) return;

        await emitAsync("gigot:pull-local", {
          conn,
          contextFolder,
          notify: true,
        });
      } catch (err) {
        EventBus.emit("logging:error", [
          `[GigotAutoSyncPoller] threw: ${err?.message || err}`,
        ]);
      }
    },
  });
}
