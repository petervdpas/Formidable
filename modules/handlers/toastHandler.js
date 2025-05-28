// modules/handlers/toastHandler.js

import { EventBus } from "../eventBus.js";
import { showToast } from "../toastManager.js";

const allowedVariants = ["info", "success", "error", "warn"];

export function handleToast({ message, variant = "info", duration = 3000 }) {

  if (!allowedVariants.includes(variant)) {
    EventBus.emit("logging:warning", [
      `[ToastHandler] Onbekende variant "${variant}", fallback naar "info".`,
    ]);
    variant = "info";
  }

  if (!message) {
    EventBus.emit("logging:warning", [
      "[ToastHandler] Geen message ontvangen.",
    ]);
    return;
  }

  showToast(message, variant, duration);
  
  EventBus.emit("logging:default", [
    `[ToastHandler] Toast weergegeven: ${variant} - "${message}"`,
  ]);
}
