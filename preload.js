// preload.js

const { contextBridge, ipcRenderer, dialog } = require("electron");

// ---------- IPC Method Groups ----------
const api = {
  internalServer: buildGroup([
    "start-internal-server",
    "stop-internal-server",
    "get-internal-server-status",
  ]),
  git: buildGroup([
    "is-git-repo",
    "get-git-root",
    "git-status",
    "git-remote-info",
    "git-pull",
    "git-push",
    "git-commit",
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
  markdown: buildGroup([
    "ensure-markdown-dir",
    "list-markdowns",
    "load-markdown",
    "save-markdown",
    "delete-markdown",
  ]),
  transform: buildGroup(["render-markdown-template", "render-html-preview"]),
  system: {
    getAppRoot: () => ipcRenderer.invoke("get-app-root"),
    resolvePath: (...args) => ipcRenderer.invoke("resolve-path", ...args),
    fileExists: (path) => ipcRenderer.invoke("file-exists", path),
    openExternal: (url) => ipcRenderer.invoke("shell-open-external", url),
  },
  dialog: {
    chooseDirectory: () => ipcRenderer.invoke("dialog-choose-directory"),
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

// ---------- Expose to Renderer ----------
contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("electron", electronAPI);
contextBridge.exposeInMainWorld("getAppInfo", () =>
  ipcRenderer.invoke("get-app-info")
);

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
