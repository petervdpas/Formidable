// modules/handlers/statusHandler.js

import { EventBus } from "../eventBus.js";

const messageTimestamps = new Map();

let statusBar = null;
let lastUpdateTime = 0;
let lastMessage = "";

export function initStatusHandler(statusBarId) {
  statusBar = document.getElementById(statusBarId);
  if (!statusBar) {
    EventBus.emit("logging:warning", [
      `[StatusHandler] Element #${statusBarId} not found.`,
    ]);
    return;
  }

  console.log("Status bar element:", statusBar);

  EventBus.emit("logging:default", [
    `[StatusHandler] Bound to #${statusBarId}`,
  ]);
}

export function handleStatusUpdate(message) {
  const now = Date.now();
  const last = messageTimestamps.get(message) || 0;

  if (now - last < 500) {
    console.log("[StatusHandler] Skipped message (too soon):", message);
    return;
  }

  messageTimestamps.set(message, now);

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
