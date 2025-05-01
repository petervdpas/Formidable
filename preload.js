// preload.js

const { contextBridge, ipcRenderer, shell } = require("electron");

// API methods exposed under window.api
const apiMethods = [
  "list-template-files",
  "load-template-file",
  "save-template-file",
  "delete-template-file",
  "get-template-descriptor",
  "ensure-markdown-dir",
  "list-meta",
  "load-meta",
  "save-meta",
  "list-markdown",
  "load-markdown",
  "save-markdown",
  "parse-markdown-to-fields",
  "generate-markdown-from-fields",
];

const api = {};
for (const method of apiMethods) {
  api[camelCase(method)] = (...args) => ipcRenderer.invoke(method, ...args);
}
api.getAppRoot = () => ipcRenderer.invoke("get-app-root");
api.resolvePath = (...args) => ipcRenderer.invoke("resolve-path", ...args);
api.fileExists = (path) => ipcRenderer.invoke("file-exists", path);

contextBridge.exposeInMainWorld("api", api);

// Config API exposed under window.configAPI
const configMethods = [
  "load-user-config",
  "save-user-config",
  "update-user-config",
];
const configAPI = {};
for (const method of configMethods) {
  configAPI[camelCase(method)] = (...args) =>
    ipcRenderer.invoke(method, ...args);
}
contextBridge.exposeInMainWorld("configAPI", configAPI);

// Dialog API (directory picker)
contextBridge.exposeInMainWorld("dialogAPI", {
  chooseDirectory: () => ipcRenderer.invoke("dialog-choose-directory"),
});

// Electron shell/app/devtools controls exposed under window.electron
contextBridge.exposeInMainWorld("electron", {
  shell: {
    openPath: (targetPath) => shell.openPath(targetPath),
  },
  app: {
    quit: () => ipcRenderer.invoke("app-quit"),
  },
  devtools: {
    toggle: () => ipcRenderer.invoke("toggle-devtools"),
  },
});

// Helper to convert kebab-case to camelCase
function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
