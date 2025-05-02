// preload.js

const { contextBridge, ipcRenderer } = require("electron");

// ---------- IPC Method Groups ----------
const api = {
  config: buildGroup([
    "load-user-config",
    "save-user-config",
    "update-user-config",
  ]),
  templates: buildGroup([
    "list-templates",
    "load-template",
    "save-template",
    "delete-template",
    "get-template-descriptor",
  ]),
  forms: buildGroup([
    "ensure-form-dir",
    "list-forms",
    "load-form",
    "save-form",
    "delete-form",
  ]),
  markdown: buildGroup([
    "ensure-markdown-dir",
    "list-markdowns",
    "load-markdown",
    "save-markdown",
    "delete-markdown",
  ]),
  transform: buildGroup([
    "parse-markdown-to-fields",
    "generate-markdown-from-fields",
  ]),
  system: {
    getAppRoot: () => ipcRenderer.invoke("get-app-root"),
    resolvePath: (...args) => ipcRenderer.invoke("resolve-path", ...args),
    fileExists: (path) => ipcRenderer.invoke("file-exists", path),
  },
};

// ---------- Dialog API ----------
const dialogAPI = {
  chooseDirectory: () => ipcRenderer.invoke("dialog-choose-directory"),
};

// ---------- Electron Shell / App Controls ----------
const electronAPI = {
  shell: {
    openPath: (targetPath) => ipcRenderer.invoke("shell-open-path", targetPath),
  },
  app: {
    quit: () => ipcRenderer.invoke("app-quit"),
  },
  devtools: {
    toggle: () => ipcRenderer.invoke("toggle-devtools"),
  },
};

// ---------- Expose to Renderer ----------
contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("dialogAPI", dialogAPI);
contextBridge.exposeInMainWorld("electron", electronAPI);

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
