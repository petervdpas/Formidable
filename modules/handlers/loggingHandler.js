// modules/handlers/loggingHandler.js

import { log, warn, error, setLoggingEnabled } from "../../utils/logger.js";
import { EventBus } from "../eventBus.js";

export function handleLoggingToggle(enabled) {
  setLoggingEnabled(!!enabled);
  log("[Handler] Logging toggled:", enabled);
  EventBus.emit("status:update", `Logging ${enabled ? "enabled" : "disabled"}`);
}

export function handleLogDefault(args) {
  log(...args);
}

export function handleLogWarning(args) {
  warn(...args);
}

export function handleLogError(args) {
  error(...args);
}
