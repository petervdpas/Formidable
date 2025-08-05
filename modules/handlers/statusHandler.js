// modules/handlers/statusHandler.js

import { EventBus } from "../eventBus.js";
import { t } from "../../utils/i18n.js";

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

export function setStatusInfo(textOrKey, options = {}) {
  const { i18nEnabled = false, args = [] } = options;

  if (!infoEl) {
    EventBus.emit("logging:warning", [
      `[StatusHandler] No info element available.`,
    ]);
    return;
  }

  infoEl.innerHTML = ""; // Clear previous content

  if (i18nEnabled && typeof textOrKey === "string") {
    const span = document.createElement("span");
    span.setAttribute("data-i18n", textOrKey);
    if (args.length) {
      span.setAttribute("data-i18n-args", JSON.stringify(args));
    }
    // Initial render
    let translated = t(textOrKey);
    translated = translated.replace(/{(\d+)}/g, (match, index) =>
      args[index] !== undefined ? String(args[index]) : match
    );
    span.textContent = translated;

    infoEl.appendChild(span);
    EventBus.emit("logging:default", [
      `[StatusHandler] Info set (i18n): "${translated}"`,
    ]);
  } else {
    infoEl.textContent = String(textOrKey);
    EventBus.emit("logging:default", [
      `[StatusHandler] Info set (raw): "${textOrKey}"`,
    ]);
  }
}