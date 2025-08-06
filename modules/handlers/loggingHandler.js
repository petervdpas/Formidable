// modules/handlers/loggingHandler.js

import { EventBus } from "../eventBus.js";

let loggingEnabled = true;

export function handleLoggingToggle(enabled) {
  loggingEnabled = !!enabled;
  EventBus.emit("status:update", {
    message: `status.logging.${enabled ? "enabled" : "disabled"}`,
    languageKey: `status.logging.${enabled ? "enabled" : "disabled"}`,
    i18nEnabled: true,
    log: loggingEnabled,
    logLevel: "default",
    logOrigin: "LoggingHandler:handleLoggingToggle",
  });
}

export function handleLogDefault(args) {
  if (loggingEnabled) {
    console.log(...args);
  }
}

export function handleLogWarning(args) {
  if (loggingEnabled) {
    console.warn(...args);
  }
}

export function handleLogError(args) {
  if (loggingEnabled) {
    console.error(...args);
  }
}
