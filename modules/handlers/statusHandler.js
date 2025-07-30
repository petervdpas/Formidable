// modules/handlers/statusHandler.js

import { EventBus } from "../eventBus.js";

const messageTimestamps = new Map();

let messageEl = null;
let infoEl = null;

export function initStatusHandler(statusBarId) {
  const container = document.getElementById(statusBarId);
  if (!container) {
    EventBus.emit("logging:warning", [
      `[StatusHandler] Element #${statusBarId} not found.`,
    ]);
    return;
  }

  messageEl = container.querySelector("#status-bar-message");
  infoEl = container.querySelector("#status-bar-info");

  if (!messageEl) {
    EventBus.emit("logging:warning", [
      `[StatusHandler] Missing #status-bar-message inside #${statusBarId}.`,
    ]);
  }

  if (!infoEl) {
    EventBus.emit("logging:warning", [
      `[StatusHandler] Missing #status-bar-info inside #${statusBarId}.`,
    ]);
  }

  EventBus.emit("logging:default", [`[StatusHandler] Initialized.`]);
}

export function handleStatusUpdate(message) {
  const now = Date.now();
  const last = messageTimestamps.get(message) || 0;

  if (now - last < 500) {
    EventBus.emit("logging:default", [
      `[StatusHandler] Skipped message (too soon): "${message}"`,
    ]);
    return;
  }

  messageTimestamps.set(message, now);

  if (messageEl) {
    messageEl.textContent = message;
    EventBus.emit("logging:default", [
      `[StatusHandler] Status message updated: "${message}"`,
    ]);
  } else {
    EventBus.emit("logging:warning", [
      `[StatusHandler] No status message element available.`,
    ]);
  }
}

export function setStatusInfo(text) {
  if (infoEl) {
    infoEl.textContent = text;
    EventBus.emit("logging:default", [`[StatusHandler] Info set: "${text}"`]);
  } else {
    EventBus.emit("logging:warning", [
      `[StatusHandler] No info element available.`,
    ]);
  }
}
