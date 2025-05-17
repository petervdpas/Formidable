// modules/handlers/statusHandler.js

import { EventBus } from "../eventBus.js";

let statusBar = null;

export function initStatusHandler(statusBarId) {
  statusBar = document.getElementById(statusBarId);
  if (!statusBar) {
    EventBus.emit("logging:warning", [
      `[StatusHandler] Element #${statusBarId} not found.`,
    ]);
    return;
  }

  EventBus.emit("logging:default", [
    `[StatusHandler] Bound to #${statusBarId}`,
  ]);
}

export function handleStatusUpdate(message) {
  if (statusBar) {
    statusBar.textContent = message;
    EventBus.emit("logging:default", [
      `[StatusHandler] Status updated: "${message}"`,
    ]);
  } else {
    EventBus.emit("logging:warning", [
      `[StatusHandler] No status bar initialized.`,
    ]);
  }
}
