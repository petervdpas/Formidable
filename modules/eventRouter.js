// modules/eventRouter.js

import { EventBus } from "./eventBus.js";
import * as contextHandlers from "./handlers/contextHandlers.js";
import * as templateHandlers from "./handlers/templateHandlers.js";
import { log } from "./logger.js";

export function initEventRouter() {
  log("[EventRouter] Initializing global event listeners...");
  EventBus.on("template:selected", templateHandlers.handleTemplateSelected);
  EventBus.on("context:toggle", contextHandlers.handleContextToggle);

}

