// modules/handlers/statusHandler.js

import { log, warn } from "../logger.js";

let statusBar = null;

export function initStatusHandler(statusBarId) {
  statusBar = document.getElementById(statusBarId);
  if (!statusBar) {
    warn(`[StatusHandler] Element #${statusBarId} not found.`);
    return;
  }

  log(`[StatusHandler] Bound to #${statusBarId}`);
}

export function handleStatusUpdate(message) {
  if (statusBar) {
    statusBar.textContent = message;
    log(`[StatusHandler] Status updated: "${message}"`);
  } else {
    warn(`[StatusHandler] No status bar initialized.`);
  }
}
