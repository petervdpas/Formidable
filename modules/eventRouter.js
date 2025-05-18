// modules/eventRouter.js

import { EventBus } from "./eventBus.js";

import * as contextHandlers from "./handlers/contextHandlers.js";
import * as templateHandlers from "./handlers/templateHandlers.js";
import * as formHandlers from "./handlers/formHandlers.js";
import * as themeHandler from "./handlers/themeHandler.js";
import * as statusHandler from "./handlers/statusHandler.js";
import * as loggingHandler from "./handlers/loggingHandler.js";
import * as listHandlers from "./handlers/listHandlers.js";

let routerInitialized = false;

export function initEventRouter() {
  if (routerInitialized) return;
  routerInitialized = true;

  console.log("[EventRouter] Initializing global event listeners...");

  // Logging
  EventBus.off("logging:toggle", loggingHandler.handleLoggingToggle);
  EventBus.off("logging:default", loggingHandler.handleLogDefault);
  EventBus.off("logging:warning", loggingHandler.handleLogWarning);
  EventBus.off("logging:error", loggingHandler.handleLogError);

  EventBus.on("logging:toggle", loggingHandler.handleLoggingToggle);
  EventBus.on("logging:default", loggingHandler.handleLogDefault);
  EventBus.on("logging:warning", loggingHandler.handleLogWarning);
  EventBus.on("logging:error", loggingHandler.handleLogError);

  // Core events
  EventBus.off("context:toggle", contextHandlers.handleContextToggle);
  EventBus.off("theme:toggle", themeHandler.handleThemeToggle);
  EventBus.off("status:update", statusHandler.handleStatusUpdate);

  EventBus.off("template:selected", templateHandlers.handleTemplateSelected);
  EventBus.off("form:selected", formHandlers.handleFormSelected);

  EventBus.off("template:list:reload", listHandlers.handleListReload);
  EventBus.off("template:list:highlighted", listHandlers.handleListHighlighted);

  EventBus.off("form:list:reload", formHandlers.handleListReload);
  EventBus.off("form:list:highlighted", listHandlers.handleListHighlighted);

  EventBus.on("template:selected", templateHandlers.handleTemplateSelected);
  EventBus.on("form:selected", formHandlers.handleFormSelected);
  EventBus.on("context:toggle", contextHandlers.handleContextToggle);
  EventBus.on("theme:toggle", themeHandler.handleThemeToggle);
  EventBus.on("status:update", statusHandler.handleStatusUpdate);

  EventBus.on("template:list:reload", () =>
    listHandlers.handleListReload({ listId: "template-list" })
  );
  EventBus.on("template:list:highlighted", (name) =>
    listHandlers.handleListHighlighted({ listId: "template-list", name })
  );

  EventBus.on("form:list:reload", () =>
    listHandlers.handleListReload({ listId: "storage-list" })
  );
  EventBus.on("form:list:highlighted", (name) =>
    listHandlers.handleListHighlighted({ listId: "storage-list", name })
  );
}
