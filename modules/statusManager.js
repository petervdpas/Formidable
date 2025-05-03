// modules/statusManager.js

import { log, warn } from "./logger.js";
import { EventBus } from "./eventBus.js";

let statusBar = null;

export function initStatusManager(statusBarId) {
  statusBar = document.getElementById(statusBarId);
  if (statusBar) {
    log(`[StatusManager] Initialized with element #${statusBarId}`);

    EventBus.on("status:update", (message) => {
      if (statusBar) {
        statusBar.textContent = message;
        log(`[StatusManager] Updated status: "${message}"`);
      } else {
        warn(
          "[StatusManager] Cannot update status: No status bar initialized."
        );
      }
    });
  } else {
    warn(
      `[StatusManager] Failed to initialize: Element #${statusBarId} not found.`
    );
  }
}
