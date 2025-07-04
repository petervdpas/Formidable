// modules/handlers/toastHandler.js

import { EventBus } from "../eventBus.js";

const allowedVariants = ["info", "success", "error", "warn"];

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

export function handleToast({ message, variant = "info", duration = 3000 }) {

  if (!allowedVariants.includes(variant)) {
    EventBus.emit("logging:warning", [
      `[ToastHandler] Unknown variant "${variant}", falling back to "info".`,
    ]);
    variant = "info";
  }

  if (!message) {
    EventBus.emit("logging:warning", [
      "[ToastHandler] No message received.",
    ]);
    return;
  }

  showToast(message, variant, duration);
  
  EventBus.emit("logging:default", [
    `[ToastHandler] Toast displayed: ${variant} - "${message}"`,
  ]);
}
