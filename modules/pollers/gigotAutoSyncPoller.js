// modules/pollers/gigotAutoSyncPoller.js

import { EventBus } from "../eventBus.js";
import { reloadUserConfig } from "../../utils/configUtil.js";
import { resolveGigotConn } from "../../utils/backendUtils.js";

const POLLER_ID = "gigot:auto-sync";
const INTERVAL_FOREGROUND_MS = 5 * 60 * 1000;
const INTERVAL_HIDDEN_MS = 15 * 60 * 1000;

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
    fn: async () => {
      try {
        // Skip the round-trip when the journal says nothing has
        // changed since the last sync — saves a push+pull per tick
        // when the user is idle and avoids 12 noop toasts/hour.
        const pendingRes = await new Promise((resolve) =>
          EventBus.emit("journal:pending", { callback: resolve })
        );
        if (pendingRes?.ok && pendingRes.data?.count === 0) return;

        await new Promise((resolve) =>
          EventBus.emit("gigot:sync-local", {
            conn,
            contextFolder,
            notify: true,
            callback: resolve,
          })
        );
      } catch (err) {
        EventBus.emit("logging:error", [
          `[GigotAutoSyncPoller] threw: ${err?.message || err}`,
        ]);
      }
    },
  });
}
