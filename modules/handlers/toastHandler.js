// modules/handlers/toastHandler.js

import { EventBus } from "../eventBus.js";
import { t } from "../../utils/i18n.js";

const allowedVariants = ["default", "info", "success", "error", "warn", "warning"];

function showToast(message, variant = "info", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${variant}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => container.removeChild(toast), 300);
  }, duration);
}

/**
 * @param {Object} options
 * @param {string} [options.message] - Optional raw message
 * @param {string} [options.languageKey] - i18n key for translation
 * @param {any[]} [options.args] - Optional arguments for {0}, {1} replacement
 * @param {string} [options.variant] - Toast type (info, error, etc.)
 * @param {number} [options.duration] - Milliseconds before auto-dismiss
 */
export function handleToast({
  message = "",
  languageKey = null,
  args = [],
  variant = "info",
  duration = 3000,
}) {
  if (!allowedVariants.includes(variant)) {
    EventBus.emit("logging:warning", [
      `[ToastHandler] Unknown variant "${variant}", falling back to "info".`,
    ]);
    variant = "info";
  }

  if (!message && !languageKey) {
    EventBus.emit("logging:warning", [
      "[ToastHandler] No message or languageKey provided.",
    ]);
    return;
  }

  let translated = languageKey ? t(languageKey) : "";

  // Interpolate {0}, {1}, etc. if args are provided
  if (translated && args.length > 0) {
    translated = translated.replace(/{(\d+)}/g, (match, index) =>
      args[index] !== undefined ? String(args[index]) : match
    );
  }

  const finalMessage = translated || message;

  showToast(finalMessage, variant, duration);

  EventBus.emit("logging:default", [
    `[ToastHandler] Toast displayed: ${variant} - "${finalMessage}"`,
  ]);
}