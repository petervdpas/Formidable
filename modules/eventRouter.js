// modules/eventRouter.js

import { EventBus } from "./eventBus.js";

import * as contextHandlers from "./handlers/contextHandlers.js";
import * as templateHandlers from "./handlers/templateHandlers.js";
import * as themeHandler from "./handlers/themeHandler.js";
import * as statusHandler from "./handlers/statusHandler.js";

import { log } from "./logger.js";

export function initEventRouter() {
  log("[EventRouter] Initializing global event listeners...");
  EventBus.on("template:selected", templateHandlers.handleTemplateSelected);
  EventBus.on("meta:list:clear", templateHandlers.handleMetaListClear);
  EventBus.on("context:toggle", contextHandlers.handleContextToggle);
  EventBus.on("theme:toggle", themeHandler.handleThemeToggle);
  EventBus.on("status:update", statusHandler.handleStatusUpdate);
}

