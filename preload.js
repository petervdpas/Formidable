// preload.js

const { contextBridge, ipcRenderer } = require("electron");

// ---------- Helpers ----------
function buildGroup(methods) {
  const group = {};
  for (const method of methods) {
    const camel = camelCase(method);
    group[camel] = (...args) => ipcRenderer.invoke(method, ...args);
  }
  return group;
}

function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

async function bindPluginIpcMethods() {
  const pluginIpcMap = await ipcRenderer.invoke("get-plugin-ipc-map");
  if (pluginIpcMap && typeof pluginIpcMap === "object") {
    for (const [pluginName, methods] of Object.entries(pluginIpcMap)) {
      api.plugin[pluginName] = {};
      for (const method of methods) {
        const route = `plugin:${pluginName}:${method}`;
        api.plugin[pluginName][method] = (...args) =>
          ipcRenderer.invoke(route, ...args);
      }
    }
    console.log("[Plugin] IPC methods bound:", Object.keys(pluginIpcMap));
  } else {
    console.warn("[Plugin] No valid plugin IPC map found.");
  }
  return pluginIpcMap;
}

// ---------- IPC Method Groups ----------
const api = {
  internalServer: buildGroup([
    "start-internal-server",
    "stop-internal-server",
    "get-internal-server-status",
  ]),
  plugin: buildGroup([
    "get-plugins-path",
    "list-plugins",
    "run-plugin",
    "get-plugin-code",
    "reload-plugins",
    "create-plugin",
    "delete-plugin",
    "update-plugin",
    "get-plugin-settings",
    "save-plugin-settings",
    "proxy-fetch-remote",
    "get-plugin-ipc-map",
  ]),
  help: buildGroup(["list-help-topics", "get-help-topic"]),
  git: buildGroup([
    "is-git-repo",
    "get-git-root",
    "git-status",
    "git-remote-info",
    "git-pull",
    "git-push",
    "git-commit",
    "git-discard",
  ]),
  config: buildGroup([
    "switch-user-profile",
    "list-user-profiles",
    "current-profile-filename",
    "load-user-config",
    "update-user-config",
    "invalidate-config-cache",
    "get-virtual-structure",
    "get-context-path",
    "get-templates-folder",
    "get-storage-folder",
    "get-template-storage-info",
    "get-template-storage-folder",
    "get-template-meta-files",
    "get-template-image-files",
    "get-single-template-entry",
  ]),
  templates: buildGroup([
    "list-templates",
    "load-template",
    "save-template",
    "delete-template",
    "validate-template",
    "get-template-descriptor",
  ]),
  forms: buildGroup([
    "ensure-form-dir",
    "list-forms",
    "extended-list-forms",
    "load-form",
    "save-form",
    "save-image-file",
    "delete-form",
  ]),
  transform: buildGroup([
    "render-markdown-template",
    "render-html-preview",
    "parse-mini-expr",
  ]),
  system: {
    getAppRoot: () => ipcRenderer.invoke("get-app-root"),
    resolvePath: (...args) => ipcRenderer.invoke("resolve-path", ...args),
    ensureDirectory: (dirPath, label) =>
      ipcRenderer.invoke("ensure-directory", { dirPath, label }),
    saveFile: (filepath, data, opts) =>
      ipcRenderer.invoke("save-file", filepath, data, opts),
    loadFile: (filepath, opts) =>
      ipcRenderer.invoke("load-file", filepath, opts),
    deleteFile: (filepath, opts) =>
      ipcRenderer.invoke("delete-file", filepath, opts),
    fileExists: (path) => ipcRenderer.invoke("file-exists", path),
    openExternal: (url) => ipcRenderer.invoke("shell-open-external", url),
    executeCommand: (cmd) => ipcRenderer.invoke("execute-command", cmd),
  },
  dialog: {
    chooseDirectory: () => ipcRenderer.invoke("dialog-choose-directory"),
    chooseFile: () => ipcRenderer.invoke("dialog-choose-file"),
  },
};

// ---------- Electron Shell / App Controls ----------
const electronAPI = {
  shell: {
    openPath: (targetPath) => ipcRenderer.invoke("shell-open-path", targetPath),
    openExternal: (url) => ipcRenderer.invoke("shell-open-external", url),
  },
  app: {
    quit: () => ipcRenderer.invoke("app-quit"),
  },
  devtools: {
    toggle: () => ipcRenderer.invoke("toggle-devtools"),
  },
  window: {
    reload: () => ipcRenderer.send("window-reload"),
    minimize: () => ipcRenderer.send("window-minimize"),
    maximize: () => ipcRenderer.send("window-maximize"),
    close: () => ipcRenderer.send("window-close"),
  },
  clipboard: {
    writeText: (text) => ipcRenderer.invoke("clipboard-write", text),
    readText: () => ipcRenderer.invoke("clipboard-read"),
  },
  sfr: {
    listFiles: (dir) => ipcRenderer.invoke("sfr:listFiles", dir),
    loadFromBase: (dir, file, opts) =>
      ipcRenderer.invoke("sfr:loadFromBase", dir, file, opts),
    saveFromBase: (dir, file, data, opts) =>
      ipcRenderer.invoke("sfr:saveFromBase", dir, file, data, opts),
    deleteFromBase: (dir, file, opts) =>
      ipcRenderer.invoke("sfr:deleteFromBase", dir, file, opts),
  },
};

(async () => {
  await bindPluginIpcMethods(); // do the actual initial bind
  api.plugin.rebindPluginMethods = bindPluginIpcMethods; // expose for dynamic rebind

  contextBridge.exposeInMainWorld("api", api);
  contextBridge.exposeInMainWorld("electron", electronAPI);
  contextBridge.exposeInMainWorld("getAppInfo", () =>
    ipcRenderer.invoke("get-app-info")
  );
})();
