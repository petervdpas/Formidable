// modules/pollers/gigotQuickStatusPoller.js
// Sibling of gitQuickStatusPoller — same shape, different backend.
// Polls GiGot's /api/health endpoint to keep the cached
// X-GiGot-Load value fresh while the GiGot status button is on
// screen. Each ping response carries the header; the existing
// observeLoad chain in gigotHandler emits gigot:load:changed when
// the level moves, which the button subscribes to for repaint.

import { EventBus } from "../eventBus.js";
import { reloadUserConfig } from "../../utils/configUtil.js";
import { resolveGigotConn } from "../../utils/backendUtils.js";
import { getChanges } from "../handlers/changeHandler.js";

export async function startGigotQuickStatusPoller(
  buttonId = "status-gigotload-btn"
) {
  const cfg = await reloadUserConfig();
  if (cfg?.remote_backend !== "gigot") return;

  const conn = resolveGigotConn(cfg);
  if (!conn?.baseUrl) return;

  const btnSelector = `#${buttonId}`;
  const POLLER_ID = "gigot:load:button";

  const pingOnce = async () => {
    try {
      await new Promise((resolve) =>
        EventBus.emit("gigot:ping", { conn, callback: resolve })
      );
    } catch {}
  };

  // Prime once so the button paints with current load shortly after
  // install rather than waiting a full interval.
  await pingOnce();

  EventBus.emit("tasks:unregister", POLLER_ID);
  EventBus.emit("tasks:register", {
    id: POLLER_ID,
    interval: 30_000,
    intervalHidden: 120_000,
    jitterPct: 0.2,
    immediate: false,
    pauseWhenHidden: true,
    condition: { type: "dom-exists", selector: btnSelector },
    backoff: { strategy: "exponential", factor: 2, max: 300_000 },
    fn: async () => {
      // pendingChangesPoller keeps getChanges() fresh — if nothing
      // is pending there's no actionable info to surface from a
      // server load probe, so skip the round trip.
      if (getChanges() === 0) return;
      await pingOnce();
    },
  });

  const mo = new MutationObserver(() => {
    if (!document.querySelector(btnSelector)) {
      EventBus.emit("tasks:unregister", POLLER_ID);
      mo.disconnect();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
