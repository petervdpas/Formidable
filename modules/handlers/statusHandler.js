// modules/handlers/statusHandler.js

import { EventBus } from "../eventBus.js";
import { t } from "../../utils/i18n.js";

const messageTimestamps = new Map();

let messageWrapper = null; // #status-bar-message
let messageSpan = null; // #status-bar-message > span
let infoEl = null;

export function initStatusHandler(statusBarId = "status-bar") {
  const container = document.getElementById(statusBarId);
  if (!container) {
    EventBus.emit("logging:warning", [
      `[StatusHandler] Element #${statusBarId} not found.`,
    ]);
    return;
  }

  messageWrapper = container.querySelector("#status-bar-message");
  messageSpan = messageWrapper?.querySelector("span") || null;
  infoEl = container.querySelector("#status-bar-info");

  if (!messageSpan) {
    EventBus.emit("logging:warning", [
      `[StatusHandler] Missing <span> inside #status-bar-message.`,
    ]);
  }

  if (!infoEl) {
    EventBus.emit("logging:warning", [
      `[StatusHandler] Missing #status-bar-info inside #${statusBarId}.`,
    ]);
  }

  EventBus.emit("logging:default", [`[StatusHandler] Initialized.`]);
}

export function handleStatusUpdate({
  message,
  languageKey = null,
  i18nEnabled = false,
  args = [],
}) {
  if (!messageSpan) {
    EventBus.emit("logging:warning", [
      `[StatusHandler] No message <span> found in #status-bar-message.`,
    ]);
    return;
  }

  let displayMessage = message;
  let messageId =
    i18nEnabled && languageKey ? `${languageKey}:${args.join("|")}` : message;

  const now = Date.now();
  const last = messageTimestamps.get(messageId) || 0;

  if (now - last < 500) {
    EventBus.emit("logging:default", [
      `[StatusHandler] Skipped message (too soon): "${messageId}"`,
    ]);
    return;
  }

  messageTimestamps.set(messageId, now);

  if (i18nEnabled && languageKey) {
    messageSpan.setAttribute("data-i18n", languageKey);
    if (args.length) {
      messageSpan.setAttribute("data-i18n-args", JSON.stringify(args));
    } else {
      messageSpan.removeAttribute("data-i18n-args");
    }

    let translated = t(languageKey);
    translated = translated.replace(/{(\d+)}/g, (match, index) =>
      args[index] !== undefined ? String(args[index]) : match
    );

    displayMessage = translated;

    EventBus.emit("logging:default", [
      `[StatusHandler] Status updated (i18n): "${translated}"`,
    ]);
  } else {
    messageSpan.removeAttribute("data-i18n");
    messageSpan.removeAttribute("data-i18n-args");

    EventBus.emit("logging:default", [
      `[StatusHandler] Status updated (plain): "${message}"`,
    ]);
  }

  messageSpan.textContent = displayMessage;
}

export function setStatusInfo(textOrKey, options = {}) {
  const { i18nEnabled = false, args = [] } = options;

  if (!infoEl) {
    EventBus.emit("logging:warning", [
      `[StatusHandler] No info element available.`,
    ]);
    return;
  }

  infoEl.innerHTML = "";

  if (i18nEnabled && typeof textOrKey === "string") {
    const span = document.createElement("span");
    span.setAttribute("data-i18n", textOrKey);
    if (args.length) {
      span.setAttribute("data-i18n-args", JSON.stringify(args));
    }

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
