// modules/eventRouter.js

import { EventBus } from "./eventBus.js";

import * as systemHandler from "./handlers/systemHandler.js";
import * as tasksHandler from "./handlers/tasksHandler.js";
import * as historyHandler from "./handlers/historyHandler.js";
import * as encryptionHandler from "./handlers/encryptionHandler.js";
import * as serverHandler from "./handlers/serverHandler.js";
import * as pluginHandler from "./handlers/pluginHandler.js";
import * as helpHandler from "./handlers/helpHandler.js";
import * as cacheHandler from "./handlers/cacheHandler.js";
import * as vfsHandler from "./handlers/vfsHandler.js";
import * as gitHandler from "./handlers/gitHandler.js";
import * as bootHandlers from "./handlers/bootHandlers.js";
import * as configHandler from "./handlers/configHandler.js";
import * as screenHandlers from "./handlers/screenHandlers.js";
import * as profileHandler from "./handlers/profileHandler.js";
import * as contextHandlers from "./handlers/contextHandlers.js";
import * as templateHandlers from "./handlers/templateHandlers.js";
import * as formHandlers from "./handlers/formHandlers.js";
import * as formCtxHandlers from "./handlers/formContextHandlers.js";
import * as modalHandler from "./handlers/modalHandler.js";
import * as themeHandler from "./handlers/themeHandler.js";
import * as statusHandler from "./handlers/statusHandler.js";
import * as loggingHandler from "./handlers/loggingHandler.js";
import * as listHandlers from "./handlers/listHandlers.js";
import * as transformHandler from "./handlers/transformHandler.js";
import * as editorHandler from "./handlers/editorHandler.js";
import * as linkHandler from "./handlers/linkHandler.js";
import * as toastHandler from "./handlers/toastHandler.js";
import * as codeExecHandler from "./handlers/codeExecHandler.js";

let routerInitialized = false;
let autobindRegistered = false;

export function initEventRouter() {
  if (routerInitialized) return;
  routerInitialized = true;

  console.log("[EventRouter] Initializing global event listeners...");

  // File events
  EventBus.off("file:resolve", systemHandler.handleResolvePath);
  EventBus.off("file:ensure-directory", systemHandler.handleEnsureDirectory);
  EventBus.off("file:save", systemHandler.handleSaveFile);
  EventBus.off("file:load", systemHandler.handleLoadFile);
  EventBus.off("file:delete", systemHandler.handleDeleteFile);
  EventBus.off("file:empty-folder", systemHandler.handleEmptyFolder);
  EventBus.off("file:copy-folder", systemHandler.handleCopyFolder);
  EventBus.off("file:copy-file", systemHandler.handleCopyFile);
  EventBus.off("file:exists", systemHandler.handleFileExists);

  EventBus.on("file:resolve", systemHandler.handleResolvePath);
  EventBus.on("file:ensure-directory", systemHandler.handleEnsureDirectory);
  EventBus.on("file:save", systemHandler.handleSaveFile);
  EventBus.on("file:load", systemHandler.handleLoadFile);
  EventBus.on("file:delete", systemHandler.handleDeleteFile);
  EventBus.on("file:empty-folder", systemHandler.handleEmptyFolder);
  EventBus.on("file:copy-folder", systemHandler.handleCopyFolder);
  EventBus.on("file:copy-file", systemHandler.handleCopyFile);
  EventBus.on("file:exists", systemHandler.handleFileExists);

  EventBus.off("system:execute", systemHandler.handleExecuteCommand);
  EventBus.on("system:execute", systemHandler.handleExecuteCommand);

  // Task scheduler events
  EventBus.off("tasks:register", tasksHandler.handleTasksRegister);
  EventBus.off("tasks:unregister", tasksHandler.handleTasksUnregister);
  EventBus.off("tasks:update", tasksHandler.handleTasksUpdate);
  EventBus.off("tasks:pause", tasksHandler.handleTasksPause);
  EventBus.off("tasks:resume", tasksHandler.handleTasksResume);
  EventBus.off("tasks:runNow", tasksHandler.handleTasksRunNow);
  EventBus.off("tasks:list", tasksHandler.handleTasksList);
  EventBus.off("tasks:exists", tasksHandler.handleTasksExists);
  EventBus.off("tasks:clearAll", tasksHandler.handleTasksClearAll);

  EventBus.on("tasks:register", tasksHandler.handleTasksRegister);
  EventBus.on("tasks:unregister", tasksHandler.handleTasksUnregister);
  EventBus.on("tasks:update", tasksHandler.handleTasksUpdate);
  EventBus.on("tasks:pause", tasksHandler.handleTasksPause);
  EventBus.on("tasks:resume", tasksHandler.handleTasksResume);
  EventBus.on("tasks:runNow", tasksHandler.handleTasksRunNow);
  EventBus.on("tasks:list", tasksHandler.handleTasksList);
  EventBus.on("tasks:exists", tasksHandler.handleTasksExists);
  EventBus.on("tasks:clearAll", tasksHandler.handleTasksClearAll);

  // Encryption events
  EventBus.off("encryption:encrypt", encryptionHandler.handleEncrypt);
  EventBus.off("encryption:decrypt", encryptionHandler.handleDecrypt);
  EventBus.off(
    "encryption:available",
    encryptionHandler.handleEncryptionAvailable
  );

  EventBus.on("encryption:encrypt", encryptionHandler.handleEncrypt);
  EventBus.on("encryption:decrypt", encryptionHandler.handleDecrypt);
  EventBus.on(
    "encryption:available",
    encryptionHandler.handleEncryptionAvailable
  );

  // Internal Server
  EventBus.off("server:start", serverHandler.handleStartServer);
  EventBus.off("server:stop", serverHandler.handleStopServer);
  EventBus.off("server:status", serverHandler.handleGetServerStatus);

  EventBus.on("server:start", serverHandler.handleStartServer);
  EventBus.on("server:stop", serverHandler.handleStopServer);
  EventBus.on("server:status", serverHandler.handleGetServerStatus);

  // History events
  EventBus.off("history:init", historyHandler.handleHistoryInit);
  EventBus.off("history:push", historyHandler.handleHistoryPush);
  EventBus.off("history:back", historyHandler.handleHistoryBack);
  EventBus.off("history:forward", historyHandler.handleHistoryForward);
  EventBus.off("history:restore", historyHandler.handleHistoryRestore);
  EventBus.off("history:navigate", historyHandler.handleHistoryNavigate);

  EventBus.on("history:init", historyHandler.handleHistoryInit);
  EventBus.on("history:push", historyHandler.handleHistoryPush);
  EventBus.on("history:back", historyHandler.handleHistoryBack);
  EventBus.on("history:forward", historyHandler.handleHistoryForward);
  EventBus.on("history:restore", historyHandler.handleHistoryRestore);
  EventBus.on("history:navigate", historyHandler.handleHistoryNavigate);

  // Plugin events
  EventBus.off("plugin:get-plugins-path", pluginHandler.handleGetPluginPath);
  EventBus.off("plugin:list", pluginHandler.handleListPlugins);
  EventBus.off("plugin:run", pluginHandler.handleRunPlugin);
  EventBus.off("plugin:reload", pluginHandler.handleReloadPlugins);
  EventBus.off("plugin:upload", pluginHandler.handleUploadPlugin);
  EventBus.off("plugin:create", pluginHandler.handleCreatePlugin);
  EventBus.off("plugin:get-code", pluginHandler.handleGetPluginCode);
  EventBus.off("plugin:delete", pluginHandler.handleDeletePlugin);
  EventBus.off("plugin:update", pluginHandler.handleUpdatePlugin);
  EventBus.off("plugin:get-settings", pluginHandler.handleGetPluginSettings);
  EventBus.off("plugin:save-settings", pluginHandler.handleSavePluginSettings);
  EventBus.off("plugin:proxy-fetch", pluginHandler.handlePluginProxyFetch);

  EventBus.on("plugin:get-plugins-path", pluginHandler.handleGetPluginPath);
  EventBus.on("plugin:list", pluginHandler.handleListPlugins);
  EventBus.on("plugin:run", pluginHandler.handleRunPlugin);
  EventBus.on("plugin:reload", pluginHandler.handleReloadPlugins);
  EventBus.on("plugin:upload", pluginHandler.handleUploadPlugin);
  EventBus.on("plugin:create", pluginHandler.handleCreatePlugin);
  EventBus.on("plugin:get-code", pluginHandler.handleGetPluginCode);
  EventBus.on("plugin:delete", pluginHandler.handleDeletePlugin);
  EventBus.on("plugin:update", pluginHandler.handleUpdatePlugin);
  EventBus.on("plugin:get-settings", pluginHandler.handleGetPluginSettings);
  EventBus.on("plugin:save-settings", pluginHandler.handleSavePluginSettings);
  EventBus.on("plugin:proxy-fetch", pluginHandler.handlePluginProxyFetch);

  if (!autobindRegistered) {
    EventBus.on("plugin:autobind", pluginHandler.autoBindPluginEvents);
    autobindRegistered = true;
  }

  // Help events
  EventBus.off("help:list", helpHandler.handleHelpList);
  EventBus.off("help:get", helpHandler.handleHelpGet);

  EventBus.on("help:list", helpHandler.handleHelpList);
  EventBus.on("help:get", helpHandler.handleHelpGet);

  // Logging + Core events
  EventBus.off("logging:toggle", loggingHandler.handleLoggingToggle);
  EventBus.off("logging:default", loggingHandler.handleLogDefault);
  EventBus.off("logging:warning", loggingHandler.handleLogWarning);
  EventBus.off("logging:error", loggingHandler.handleLogError);

  EventBus.off("ui:toast", toastHandler.handleToast);
  EventBus.off("screen:fullscreen", screenHandlers.handleFullscreenToggle);
  EventBus.off(
    "screen:meta:visibility",
    screenHandlers.handleStorageMetaVisibility
  );
  EventBus.off("theme:toggle", themeHandler.handleThemeToggle);
  EventBus.off("status:update", statusHandler.handleStatusUpdate);

  EventBus.on("logging:toggle", loggingHandler.handleLoggingToggle);
  EventBus.on("logging:default", loggingHandler.handleLogDefault);
  EventBus.on("logging:warning", loggingHandler.handleLogWarning);
  EventBus.on("logging:error", loggingHandler.handleLogError);

  EventBus.on("ui:toast", toastHandler.handleToast);
  EventBus.on("screen:fullscreen", screenHandlers.handleFullscreenToggle);
  EventBus.on(
    "screen:meta:visibility",
    screenHandlers.handleStorageMetaVisibility
  );

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
  EventBus.off("config:invalidate", configHandler.handleConfigInvalidate);
  EventBus.on("config:invalidate", configHandler.handleConfigInvalidate);
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
    "config:template:singleEntry",
    configHandler.handleGetSingleTemplateEntry
  );
  EventBus.on(
    "config:template:singleEntry",
    configHandler.handleGetSingleTemplateEntry
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

  // Template events
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
  EventBus.off(
    "template:itemFields",
    templateHandlers.handleGetPossibleItemFields
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
  EventBus.on(
    "template:itemFields",
    templateHandlers.handleGetPossibleItemFields
  );

  EventBus.off("template:list:reload", listHandlers.handleListReload);
  EventBus.off("template:list:itemClicked", listHandlers.handleListItemClicked);
  EventBus.off(
    "template:list:refreshAfterSave",
    listHandlers.handleListRefreshAfterSave
  );
  EventBus.off("template:list:highlighted", listHandlers.handleListHighlighted);

  EventBus.on("template:list:reload", () =>
    listHandlers.handleListReload({ listId: "template-list" })
  );
  EventBus.on("template:list:itemClicked", (name) =>
    listHandlers.handleListItemClicked({ listId: "template-list", name })
  );
  EventBus.on("template:list:refreshAfterSave", (e) =>
    listHandlers.handleListRefreshAfterSave({ listId: "template-list", ...e })
  );
  EventBus.on("template:list:highlighted", (payload) => {
    const name = typeof payload === "string" ? payload : payload?.name;
    const click =
      typeof payload === "object" && payload?.click !== undefined
        ? payload.click
        : true;
    listHandlers.handleListHighlighted({
      listId: "template-list",
      name,
      click,
    });
  });

  EventBus.off("code:execute", codeExecHandler.handleCodeExecute);
  EventBus.on("code:execute", codeExecHandler.handleCodeExecute);

  // Form Context events
  EventBus.off("form:context:get", formCtxHandlers.handleFormContextGet);
  EventBus.off("form:context:update", formCtxHandlers.handleFormContextUpdate);

  EventBus.on("form:context:update", formCtxHandlers.handleFormContextUpdate);
  EventBus.on("form:context:get", formCtxHandlers.handleFormContextGet);

  // Form events
  EventBus.off("form:selected", formHandlers.handleFormSelected);
  EventBus.off("form:list", formHandlers.handleListForms);
  EventBus.off("form:extendedList", formHandlers.handleExtendedListForms);
  EventBus.off("form:load:run:onload", formHandlers.handleOnLoadRun);
  EventBus.off("form:load", formHandlers.handleLoadForm);
  EventBus.off("form:save:run:before", formHandlers.handleBeforeSaveRun);
  EventBus.off("form:save", formHandlers.handleSaveForm);
  EventBus.off("form:delete", formHandlers.handleDeleteForm);
  EventBus.off("form:ensureDir", formHandlers.handleEnsureFormDir);
  EventBus.off("form:saveImage", formHandlers.handleSaveImageFile);

  EventBus.on("form:selected", formHandlers.handleFormSelected);
  EventBus.on("form:list", formHandlers.handleListForms);
  EventBus.on("form:extendedList", formHandlers.handleExtendedListForms);
  EventBus.on("form:load:run:onload", formHandlers.handleOnLoadRun);
  EventBus.on("form:load", formHandlers.handleLoadForm);
  EventBus.on("form:save:run:before", formHandlers.handleBeforeSaveRun);
  EventBus.on("form:save", formHandlers.handleSaveForm);
  EventBus.on("form:delete", formHandlers.handleDeleteForm);
  EventBus.on("form:ensureDir", formHandlers.handleEnsureFormDir);
  EventBus.on("form:saveImage", formHandlers.handleSaveImageFile);

  EventBus.off("form:list:reload", listHandlers.handleListReload);
  EventBus.off(
    "form:list:refreshAfterSave",
    listHandlers.handleListRefreshAfterSave
  );
  EventBus.off("form:list:updateItem", listHandlers.handleListUpdateItem);
  EventBus.off("form:list:itemClicked", listHandlers.handleListItemClicked);
  EventBus.off("form:list:highlighted", listHandlers.handleListHighlighted);

  EventBus.on("form:list:reload", () =>
    listHandlers.handleListReload({ listId: "storage-list" })
  );
  EventBus.on("form:list:refreshAfterSave", (e) =>
    listHandlers.handleListRefreshAfterSave({ listId: "storage-list", ...e })
  );
  EventBus.on("form:list:updateItem", (e) =>
    listHandlers.handleListUpdateItem({ listId: "storage-list", ...e })
  );
  EventBus.on("form:list:itemClicked", (name) =>
    listHandlers.handleListItemClicked({ listId: "storage-list", name })
  );
  EventBus.on("form:list:highlighted", (payload) => {
    const name = typeof payload === "string" ? payload : payload?.name;
    const click =
      typeof payload === "object" && payload?.click !== undefined
        ? payload.click
        : true;
    listHandlers.handleListHighlighted({ listId: "storage-list", name, click });
  });

  // Modal events
  EventBus.off("modal:template:confirm", modalHandler.handleTemplateConfirm);
  EventBus.off("modal:entry:confirm", modalHandler.handleEntryConfirm);
  EventBus.on("modal:template:confirm", modalHandler.handleTemplateConfirm);
  EventBus.on("modal:entry:confirm", modalHandler.handleEntryConfirm);

  // Editor events
  EventBus.off("editor:save", editorHandler.handleSaveTemplate);
  EventBus.off("editor:delete", editorHandler.handleDeleteTemplate);
  EventBus.on("editor:save", ({ container, fields, callback }) =>
    editorHandler.handleSaveTemplate({ container, fields, callback })
  );
  EventBus.on("editor:delete", (container) =>
    editorHandler.handleDeleteTemplate(container)
  );

  // Link events
  EventBus.off("link:external:open", linkHandler.handleOpenExternal);
  EventBus.off(
    "link:formidable:navigate",
    linkHandler.handleFormidableNavigate
  );
  EventBus.on("link:external:open", linkHandler.handleOpenExternal);
  EventBus.on("link:formidable:navigate", linkHandler.handleFormidableNavigate);

  // Transform events
  EventBus.off("transform:markdown", transformHandler.handleRenderMarkdown);
  EventBus.off("transform:html", transformHandler.handleRenderHtml);
  EventBus.off("transform:parseMiniExpr", transformHandler.handleParseMiniExpr);
  EventBus.off(
    "transform:parseFrontmatter",
    transformHandler.handleParseFrontmatter
  );
  EventBus.off(
    "transform:buildFrontmatter",
    transformHandler.handleBuildFrontmatter
  );
  EventBus.off(
    "transform:filterFrontmatter",
    transformHandler.handleFilterFrontmatter
  );

  EventBus.on("transform:markdown", transformHandler.handleRenderMarkdown);
  EventBus.on("transform:html", transformHandler.handleRenderHtml);
  EventBus.on("transform:parseMiniExpr", transformHandler.handleParseMiniExpr);
  EventBus.on(
    "transform:parseFrontmatter",
    transformHandler.handleParseFrontmatter
  );
  EventBus.on(
    "transform:buildFrontmatter",
    transformHandler.handleBuildFrontmatter
  );
  EventBus.on(
    "transform:filterFrontmatter",
    transformHandler.handleFilterFrontmatter
  );

  // Git events
  EventBus.off("git:check", gitHandler.handleGitCheckRepo);
  EventBus.off("git:root", gitHandler.handleGitGetRoot);
  EventBus.off("git:status", gitHandler.handleGitStatus);
  EventBus.off("git:remote-info", gitHandler.handleGitRemoteInfo);
  EventBus.off("git:pull", gitHandler.handleGitPull);
  EventBus.off("git:push", gitHandler.handleGitPush);
  EventBus.off("git:commit", gitHandler.handleGitCommit);
  EventBus.off("git:discard", gitHandler.handleGitDiscard);

  EventBus.on("git:check", gitHandler.handleGitCheckRepo);
  EventBus.on("git:root", gitHandler.handleGitGetRoot);
  EventBus.on("git:status", gitHandler.handleGitStatus);
  EventBus.on("git:remote-info", gitHandler.handleGitRemoteInfo);
  EventBus.on("git:pull", gitHandler.handleGitPull);
  EventBus.on("git:push", gitHandler.handleGitPush);
  EventBus.on("git:commit", gitHandler.handleGitCommit);
  EventBus.on("git:discard", gitHandler.handleGitDiscard);

  // Advanced Git events
  EventBus.off("git:fetch", gitHandler.handleGitFetch);
  EventBus.off("git:set-upstream", gitHandler.handleGitSetUpstream);
  EventBus.off("git:add-all", gitHandler.handleGitAddAll);
  EventBus.off("git:add-paths", gitHandler.handleGitAddPaths);
  EventBus.off("git:reset-paths", gitHandler.handleGitResetPaths);
  EventBus.off("git:commit-paths", gitHandler.handleGitCommitPaths);
  EventBus.off("git:branches", gitHandler.handleGitBranches);
  EventBus.off("git:branch-create", gitHandler.handleGitBranchCreate);
  EventBus.off("git:checkout", gitHandler.handleGitCheckout);
  EventBus.off("git:branch-delete", gitHandler.handleGitBranchDelete);
  EventBus.off("git:diff-name-only", gitHandler.handleGitDiffNameOnly);
  EventBus.off("git:diff-file", gitHandler.handleGitDiffFile);
  EventBus.off("git:log", gitHandler.handleGitLog);
  EventBus.off("git:reset-hard", gitHandler.handleGitResetHard);
  EventBus.off("git:revert", gitHandler.handleGitRevert);
  EventBus.off("git:merge", gitHandler.handleGitMerge);
  EventBus.off("git:merge-abort", gitHandler.handleGitMergeAbort);
  EventBus.off("git:rebase-start", gitHandler.handleGitRebaseStart);
  EventBus.off("git:rebase-continue", gitHandler.handleGitRebaseContinue);
  EventBus.off("git:rebase-abort", gitHandler.handleGitRebaseAbort);
  EventBus.off("git:conflicts", gitHandler.handleGitConflicts);
  EventBus.off("git:mergetool", gitHandler.handleGitMergetool);
  EventBus.off("git:open-in-vscode", gitHandler.handleGitOpenInVSCode);

  EventBus.on("git:fetch", gitHandler.handleGitFetch);
  EventBus.on("git:set-upstream", gitHandler.handleGitSetUpstream);
  EventBus.on("git:add-all", gitHandler.handleGitAddAll);
  EventBus.on("git:add-paths", gitHandler.handleGitAddPaths);
  EventBus.on("git:reset-paths", gitHandler.handleGitResetPaths);
  EventBus.on("git:commit-paths", gitHandler.handleGitCommitPaths);
  EventBus.on("git:branches", gitHandler.handleGitBranches);
  EventBus.on("git:branch-create", gitHandler.handleGitBranchCreate);
  EventBus.on("git:checkout", gitHandler.handleGitCheckout);
  EventBus.on("git:branch-delete", gitHandler.handleGitBranchDelete);
  EventBus.on("git:diff-name-only", gitHandler.handleGitDiffNameOnly);
  EventBus.on("git:diff-file", gitHandler.handleGitDiffFile);
  EventBus.on("git:log", gitHandler.handleGitLog);
  EventBus.on("git:reset-hard", gitHandler.handleGitResetHard);
  EventBus.on("git:revert", gitHandler.handleGitRevert);
  EventBus.on("git:merge", gitHandler.handleGitMerge);
  EventBus.on("git:merge-abort", gitHandler.handleGitMergeAbort);
  EventBus.on("git:rebase-start", gitHandler.handleGitRebaseStart);
  EventBus.on("git:rebase-continue", gitHandler.handleGitRebaseContinue);
  EventBus.on("git:rebase-abort", gitHandler.handleGitRebaseAbort);
  EventBus.on("git:conflicts", gitHandler.handleGitConflicts);
  EventBus.on("git:mergetool", gitHandler.handleGitMergetool);
  EventBus.on("git:open-in-vscode", gitHandler.handleGitOpenInVSCode);

  // Cache events
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

  // VFS events
  EventBus.off("vfs:init", vfsHandler.initVFS);
  EventBus.off("vfs:clear", vfsHandler.clearVFS);
  EventBus.off("vfs:reload", vfsHandler.reloadVFS);
  EventBus.off("vfs:update", vfsHandler.updateVFSKey);
  EventBus.off("vfs:delete", vfsHandler.deleteVFSKey);
  EventBus.off("vfs:refreshTemplate", vfsHandler.refreshTemplateEntry);
  EventBus.off("vfs:listTemplates", vfsHandler.handleListTemplates);
  EventBus.off(
    "vfs:getTemplateMetaFiles",
    vfsHandler.handleGetTemplateMetaFiles
  );

  EventBus.on("vfs:init", vfsHandler.initVFS);
  EventBus.on("vfs:clear", vfsHandler.clearVFS);
  EventBus.on("vfs:reload", vfsHandler.reloadVFS);
  EventBus.on("vfs:update", vfsHandler.updateVFSKey);
  EventBus.on("vfs:delete", vfsHandler.deleteVFSKey);
  EventBus.on("vfs:refreshTemplate", vfsHandler.refreshTemplateEntry);
  EventBus.on("vfs:listTemplates", vfsHandler.handleListTemplates);
  EventBus.on(
    "vfs:getTemplateMetaFiles",
    vfsHandler.handleGetTemplateMetaFiles
  );

  EventBus.off("boot:initialize", bootHandlers.initializeFromConfig);
  EventBus.on("boot:initialize", async (config) => {
    await bootHandlers.initializeFromConfig(config);
  });
}
