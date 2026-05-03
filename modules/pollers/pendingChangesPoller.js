// modules/pollers/pendingChangesPoller.js
// Orchestrator. Owns two responsibilities:
//   1. Polls config/boot.json's pending_changes counter (its own
//      tick) so getChanges() stays fresh for any UI subscriber.
//   2. Registers the right backend-specific sibling poller
//      (gitQuickStatusPoller OR gigotQuickStatusPoller) based on
//      cfg.remote_backend, so only one of them runs at a time and
//      neither boots when local-only.
//
// Not coupled to any specific status button — the count is generic
// state that drives sibling poller decisions; siblings still gate
// their own work on the count being non-zero, since there's no
// actionable info to surface when nothing is pending.

import { EventBus } from "../eventBus.js";
import { reloadUserConfig } from "../../utils/configUtil.js";
import { startGitQuickStatusPoller } from "./gitQuickStatusPoller.js";
import { startGigotQuickStatusPoller } from "./gigotQuickStatusPoller.js";
import { startGigotAutoSyncPoller } from "./gigotAutoSyncPoller.js";

export async function startPendingChangesPoller() {
  const POLLER_ID = "changes:counter";

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
        await new Promise((resolve) =>
          EventBus.emit("changes:get", { callback: resolve })
        );
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
