// modules/eventRouter.js

import { EventBus } from "./eventBus.js";
import * as templateHandlers from "./handlers/templateHandlers.js";
import { log } from "./logger.js";

export function initEventRouter() {
  log("[EventRouter] Initializing global event listeners...");
  EventBus.on("template:selected", templateHandlers.handleTemplateSelected);
}

