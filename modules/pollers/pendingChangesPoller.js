// modules/pollers/pendingChangesPoller.js
// Orchestrator. Polls journal:pending (count derived from journal
// minus cursor), emits journal:changed when the value moves, and
// registers the right backend-specific sibling poller based on
// cfg.remote_backend. Sibling pollers gate themselves on
// getLastKnownPending() so they skip work when nothing's pending.

import { EventBus } from "../eventBus.js";
import { reloadUserConfig } from "../../utils/configUtil.js";
import { startGitQuickStatusPoller } from "./gitQuickStatusPoller.js";
import { startGigotQuickStatusPoller } from "./gigotQuickStatusPoller.js";
import { startGigotAutoSyncPoller } from "./gigotAutoSyncPoller.js";
import { getLastKnownPending } from "../handlers/journalHandler.js";

export async function startPendingChangesPoller() {
  const POLLER_ID = "journal:pending";

  EventBus.emit("tasks:unregister", POLLER_ID);
  EventBus.emit("tasks:register", {
    id: POLLER_ID,
    interval: 15_000,
    intervalHidden: 60_000,
    jitterPct: 0.2,
    immediate: true,
    pauseWhenHidden: true,
    backoff: { strategy: "exponential", factor: 2, max: 120_000 },
    fn: async () => {
      try {
        const res = await new Promise((resolve) =>
          EventBus.emit("journal:pending", { callback: resolve })
        );
        const count = res?.ok ? res.data?.count ?? 0 : 0;
        if (count !== getLastKnownPending()) {
          EventBus.emit("journal:changed", [{ count }]);
        }
      } catch {}
    },
  });

  // Bring up the right backend sibling. Only one will run at a
  // time; the other isn't registered, so pays nothing.
  const cfg = await reloadUserConfig();
  const backend = cfg?.remote_backend;
  if (backend === "git") {
    await startGitQuickStatusPoller("status-gitquick-btn");
  } else if (backend === "gigot") {
    await startGigotQuickStatusPoller("status-gigotload-btn");
    await startGigotAutoSyncPoller();
  }
}
