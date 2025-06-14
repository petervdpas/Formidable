// modules/eventRouter.js

import { EventBus } from "./eventBus.js";

import * as cacheHandler from "./handlers/cacheHandler.js";
import * as vfsHandler from "./handlers/vfsHandler.js";
import * as bootHandlers from "./handlers/bootHandlers.js";
import * as configHandler from "./handlers/configHandler.js";
import * as screenHandlers from "./handlers/screenHandlers.js";
import * as profileHandler from "./handlers/profileHandler.js";
import * as contextHandlers from "./handlers/contextHandlers.js";
import * as templateHandlers from "./handlers/templateHandlers.js";
import * as formHandlers from "./handlers/formHandlers.js";
import * as modalHandler from "./handlers/modalHandler.js";
import * as themeHandler from "./handlers/themeHandler.js";
import * as statusHandler from "./handlers/statusHandler.js";
import * as loggingHandler from "./handlers/loggingHandler.js";
import * as listHandlers from "./handlers/listHandlers.js";
import * as transformHandler from "./handlers/transformHandler.js";
import * as editorHandler from "./handlers/editorHandler.js";
import * as toastHandler from "./handlers/toastHandler.js";

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

  EventBus.off("ui:toast", toastHandler.handleToast);

  EventBus.on("logging:toggle", loggingHandler.handleLoggingToggle);
  EventBus.on("logging:default", loggingHandler.handleLogDefault);
  EventBus.on("logging:warning", loggingHandler.handleLogWarning);
  EventBus.on("logging:error", loggingHandler.handleLogError);

  EventBus.on("ui:toast", toastHandler.handleToast);

  // Core events
  EventBus.off("screen:fullscreen", screenHandlers.handleFullscreenToggle);
  EventBus.off("theme:toggle", themeHandler.handleThemeToggle);
  EventBus.off("status:update", statusHandler.handleStatusUpdate);

  EventBus.on("screen:fullscreen", screenHandlers.handleFullscreenToggle);
  EventBus.on("theme:toggle", themeHandler.handleThemeToggle);
  EventBus.on("status:update", statusHandler.handleStatusUpdate);

  EventBus.off(
    "profile:list:highlighted",
    profileHandler.handleProfileHighlighted
  );
  EventBus.on(
    "profile:list:highlighted",
    profileHandler.handleProfileHighlighted
  );

  // Config events
  EventBus.off("config:load", configHandler.handleConfigLoad);
  EventBus.off("config:update", configHandler.handleConfigUpdate);
  EventBus.on("config:update", configHandler.handleConfigUpdate);
  EventBus.on("config:load", configHandler.handleConfigLoad);
  EventBus.off("config:context:paths", configHandler.handleGetContextPaths);
  EventBus.on("config:context:paths", configHandler.handleGetContextPaths);
  EventBus.off(
    "config:template:storagePath",
    configHandler.handleGetTemplateStoragePath
  );
  EventBus.on(
    "config:template:storagePath",
    configHandler.handleGetTemplateStoragePath
  );
  EventBus.off(
    "config:profile:current",
    configHandler.handleGetCurrentProfileFilename
  );
  EventBus.on(
    "config:profile:current",
    configHandler.handleGetCurrentProfileFilename
  );
  EventBus.off("config:profiles:list", configHandler.handleListProfiles);
  EventBus.on("config:profiles:list", configHandler.handleListProfiles);
  EventBus.off("config:profiles:switch", configHandler.handleProfileSwitch);
  EventBus.on("config:profiles:switch", configHandler.handleProfileSwitch);

  // Profile events
  EventBus.off("context:toggle", contextHandlers.handleContextToggle);
  EventBus.on("context:toggle", contextHandlers.handleContextToggle);

  EventBus.off("template:selected", templateHandlers.handleTemplateSelected);
  EventBus.off("template:list", templateHandlers.handleListTemplates);
  EventBus.off("template:load", templateHandlers.handleLoadTemplate);
  EventBus.off("template:save", templateHandlers.handleSaveTemplate);
  EventBus.off("template:delete", templateHandlers.handleDeleteTemplate);
  EventBus.off("template:validate", templateHandlers.handleValidateTemplate);
  EventBus.off(
    "template:descriptor",
    templateHandlers.handleGetTemplateDescriptor
  );
  EventBus.on("template:selected", templateHandlers.handleTemplateSelected);
  EventBus.on("template:list", templateHandlers.handleListTemplates);
  EventBus.on("template:load", templateHandlers.handleLoadTemplate);
  EventBus.on("template:save", templateHandlers.handleSaveTemplate);
  EventBus.on("template:delete", templateHandlers.handleDeleteTemplate);
  EventBus.on("template:validate", templateHandlers.handleValidateTemplate);
  EventBus.on(
    "template:descriptor",
    templateHandlers.handleGetTemplateDescriptor
  );

  EventBus.off("template:list:reload", listHandlers.handleListReload);
  EventBus.off("template:list:itemClicked", listHandlers.handleListItemClicked);
  EventBus.off("template:list:highlighted", listHandlers.handleListHighlighted);

  EventBus.on("template:list:reload", () =>
    listHandlers.handleListReload({ listId: "template-list" })
  );
  EventBus.on("template:list:itemClicked", (name) =>
    listHandlers.handleListItemClicked({ listId: "template-list", name })
  );
  EventBus.on("template:list:highlighted", (name) =>
    listHandlers.handleListHighlighted({ listId: "template-list", name })
  );

  EventBus.off("form:selected", formHandlers.handleFormSelected);
  EventBus.off("form:list", formHandlers.handleListForms);
  EventBus.off("form:load", formHandlers.handleLoadForm);
  EventBus.off("form:save", formHandlers.handleSaveForm);
  EventBus.off("form:delete", formHandlers.handleDeleteForm);
  EventBus.off("form:ensureDir", formHandlers.handleEnsureFormDir);
  EventBus.off("form:saveImage", formHandlers.handleSaveImageFile);

  EventBus.on("form:selected", formHandlers.handleFormSelected);
  EventBus.on("form:list", formHandlers.handleListForms);
  EventBus.on("form:load", formHandlers.handleLoadForm);
  EventBus.on("form:save", formHandlers.handleSaveForm);
  EventBus.on("form:delete", formHandlers.handleDeleteForm);
  EventBus.on("form:ensureDir", formHandlers.handleEnsureFormDir);
  EventBus.on("form:saveImage", formHandlers.handleSaveImageFile);

  EventBus.off("form:list:reload", formHandlers.handleListReload);
  EventBus.off("form:list:itemClicked", listHandlers.handleListItemClicked);
  EventBus.off("form:list:highlighted", listHandlers.handleListHighlighted);

  EventBus.on("form:list:reload", () =>
    listHandlers.handleListReload({ listId: "storage-list" })
  );
  EventBus.on("form:list:itemClicked", (name) =>
    listHandlers.handleListItemClicked({ listId: "storage-list", name })
  );
  EventBus.on("form:list:highlighted", (name) =>
    listHandlers.handleListHighlighted({ listId: "storage-list", name })
  );

  EventBus.off("modal:template:confirm", modalHandler.handleTemplateConfirm);
  EventBus.off("modal:entry:confirm", modalHandler.handleEntryConfirm);

  EventBus.on("modal:template:confirm", modalHandler.handleTemplateConfirm);
  EventBus.on("modal:entry:confirm", modalHandler.handleEntryConfirm);

  EventBus.off("editor:save", editorHandler.handleSaveTemplate);
  EventBus.off("editor:delete", editorHandler.handleDeleteTemplate);

  EventBus.on("editor:save", ({ container, fields, callback }) =>
    editorHandler.handleSaveTemplate({ container, fields, callback })
  );

  EventBus.on("editor:delete", (container) =>
    editorHandler.handleDeleteTemplate(container)
  );

  EventBus.off("transform:markdown", transformHandler.handleRenderMarkdown);
  EventBus.off("transform:html", transformHandler.handleRenderHtml);
  EventBus.on("transform:markdown", transformHandler.handleRenderMarkdown);
  EventBus.on("transform:html", transformHandler.handleRenderHtml);

  EventBus.off("cache:init", cacheHandler.initCache);
  EventBus.off("cache:loadFromDisk", cacheHandler.handleCacheLoadFromDisk);
  EventBus.off("cache:saveToDisk", cacheHandler.handleCacheSaveToDisk);
  EventBus.off("cache:deleteFromDisk", cacheHandler.handleCacheDeleteFromDisk);
  EventBus.off("cache:add", cacheHandler.handleCacheAdd);
  EventBus.off("cache:put", cacheHandler.handleCachePut);
  EventBus.off("cache:get", cacheHandler.handleCacheGet);
  EventBus.off("cache:getAll", cacheHandler.handleCacheGetAll);
  EventBus.off("cache:delete", cacheHandler.handleCacheDelete);
  EventBus.off("cache:clear", cacheHandler.handleCacheClear);

  EventBus.on("cache:init", async ({ dbName, version, stores }) => {
    await cacheHandler.initCache(dbName, version, stores);
  });
  EventBus.on("cache:loadFromDisk", cacheHandler.handleCacheLoadFromDisk);
  EventBus.on("cache:saveToDisk", cacheHandler.handleCacheSaveToDisk);
  EventBus.on("cache:deleteFromDisk", cacheHandler.handleCacheDeleteFromDisk);
  EventBus.on("cache:add", cacheHandler.handleCacheAdd);
  EventBus.on("cache:put", cacheHandler.handleCachePut);
  EventBus.on("cache:get", cacheHandler.handleCacheGet);
  EventBus.on("cache:getAll", cacheHandler.handleCacheGetAll);
  EventBus.on("cache:delete", cacheHandler.handleCacheDelete);
  EventBus.on("cache:clear", cacheHandler.handleCacheClear);

  EventBus.off("vfs:init", vfsHandler.initVFS);
  EventBus.off("vfs:clear", vfsHandler.clearVFS);
  EventBus.off("vfs:reload", vfsHandler.reloadVFS);
  EventBus.off("vfs:update", vfsHandler.updateVFSKey);
  EventBus.off("vfs:delete", vfsHandler.deleteVFSKey);

  EventBus.on("vfs:init", vfsHandler.initVFS);
  EventBus.on("vfs:clear", vfsHandler.clearVFS);
  EventBus.on("vfs:reload", vfsHandler.reloadVFS);
  EventBus.on("vfs:update", vfsHandler.updateVFSKey);
  EventBus.on("vfs:delete", vfsHandler.deleteVFSKey);

  EventBus.off("boot:initialize", bootHandlers.initializeFromConfig);
  EventBus.on("boot:initialize", async (config) => {
    await bootHandlers.initializeFromConfig(config);
  });
}
