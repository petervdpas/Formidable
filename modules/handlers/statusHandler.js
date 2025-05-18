// modules/handlers/statusHandler.js

import { EventBus } from "../eventBus.js";

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

  // Prevent overwriting meaningful messages too quickly
  const isRepeat = message === lastMessage;
  const isTooSoon = now - lastUpdateTime < 500;

  if (isTooSoon && !isRepeat) {
    console.log("[StatusHandler] Skipped message (too soon):", message);
    return;
  }

  lastUpdateTime = now;
  lastMessage = message;

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
