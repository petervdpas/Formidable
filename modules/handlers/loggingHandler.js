// modules/handlers/loggingHandler.js

import { log, setLoggingEnabled } from "../../utils/logger.js";
import { EventBus } from "../eventBus.js";

export function handleLoggingToggle(enabled) {
  setLoggingEnabled(!!enabled);
  log("[Handler] Logging toggled:", enabled);
  EventBus.emit("status:update", `Logging ${enabled ? "enabled" : "disabled"}`);
}
