// modules/handlers/statusHandler.js

import { EventBus } from "../eventBus.js";
import { t } from "../../utils/i18n.js";
import { createStatusButton as makeBtn } from "../../utils/buttonUtils.js";

const PROCESS_INTERVAL_MESSAGE = 700;
const PROCESS_INTERVAL_INFO = 100;

const messageTimestamps = new Map();
const messageQueue = [];
const infoQueue = [];

let statusButtonContainer = null;
const statusButtons = new Map();

let messageWrapper = null;
let messageSpan = null;
let infoEl = null;
let isProcessingMessage = false;
let isProcessingInfo = false;

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

  setInterval(processNextStatusMessage, PROCESS_INTERVAL_MESSAGE);
  setInterval(processNextStatusInfo, PROCESS_INTERVAL_INFO);

  EventBus.emit("logging:default", [`[StatusHandler] Initialized.`]);
}

function logEmittedStatus(
  message,
  logOrigin = "StatusHandler",
  logLevel = "default"
) {
  EventBus.emit(`logging:${logLevel}`, [`[${logOrigin}] ${message}`]);
}

// Enqueue status message
export function handleStatusUpdate(payload) {
  messageQueue.push(payload);
}

// Enqueue status info
export function setStatusInfo(textOrKey, options = {}) {
  infoQueue.push({ textOrKey, options });
}

function processNextStatusMessage() {
  if (isProcessingMessage || messageQueue.length === 0 || !messageSpan) return;
  isProcessingMessage = true;

  const {
    message,
    languageKey = null,
    i18nEnabled = false,
    args = [],
    log = false,
    logLevel = "default",
    logOrigin = null,
    variant = "info",
  } = messageQueue.shift();

  let displayMessage = message;
  let messageId =
    i18nEnabled && languageKey ? `${languageKey}:${args.join("|")}` : message;

  const now = Date.now();
  const last = messageTimestamps.get(messageId) || 0;

  if (now - last < 500) {
    EventBus.emit("logging:default", [
      `[StatusHandler] Skipped duplicate message: "${messageId}"`,
    ]);
    isProcessingMessage = false;
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

    if (log) {
      logEmittedStatus(displayMessage, logOrigin || "StatusHandler", logLevel);
    }
  } else {
    messageSpan.removeAttribute("data-i18n");
    messageSpan.removeAttribute("data-i18n-args");

    if (log) {
      logEmittedStatus(displayMessage, logOrigin || "StatusHandler", logLevel);
    }
  }

  // Apply variant class
  messageSpan.classList.remove(
    "status-info",
    "status-success",
    "status-warning",
    "status-error"
  );
  messageSpan.classList.add(`status-${variant}`);

  messageSpan.textContent = displayMessage;
  isProcessingMessage = false;
}

function processNextStatusInfo() {
  if (isProcessingInfo || infoQueue.length === 0 || !infoEl) return;
  isProcessingInfo = true;

  const { textOrKey, options } = infoQueue.shift();
  const { i18nEnabled = false, args = [] } = options;

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

  isProcessingInfo = false;
}

// Status Buttons

export function initStatusButtonsHandler(containerId = "status-bar-buttons") {
  statusButtonContainer = document.getElementById(containerId);
  if (!statusButtonContainer) {
    EventBus.emit("logging:warning", [
      `[StatusButtons] Element #${containerId} not found.`,
    ]);
    return;
  }
  statusButtonContainer.classList.add("status-buttons-host");
  EventBus.emit("logging:default", ["[StatusButtons] Initialized."]);
}

export function addStatusButton(cfg = {}) {
  if (!statusButtonContainer) {
    EventBus.emit("logging:warning", [
      "[StatusButtons] Not initialized; call initStatusButtonsHandler() first.",
    ]);
    return null;
  }
  const { id } = cfg;
  if (!id) {
    EventBus.emit("logging:warning", [
      "[StatusButtons] addStatusButton requires an 'id'.",
    ]);
    return null;
  }
  if (statusButtons.has(id)) {
    EventBus.emit("logging:warning", [
      `[StatusButtons] Button '${id}' already exists; skipping.`,
    ]);
    return statusButtons.get(id);
  }
  const btn = makeBtn(statusButtonContainer, cfg);
  if (btn) statusButtons.set(id, btn);
  return btn;
}

export function removeStatusButton(id) {
  const btn = statusButtons.get(id);
  if (!btn) return false;
  btn.remove();
  statusButtons.delete(id);
  return true;
}

export function getStatusButton(id) {
  return statusButtons.get(id) || null;
}

export function setStatusButtons(buttonCfgs = []) {
  if (!statusButtonContainer) {
    EventBus.emit("logging:warning", [
      "[StatusButtons] Not initialized; call initStatusButtonsHandler() first.",
    ]);
    return;
  }
  // Clear existing
  for (const [, btn] of statusButtons) btn.remove();
  statusButtons.clear();

  // Add new
  for (const cfg of buttonCfgs) addStatusButton(cfg);
}