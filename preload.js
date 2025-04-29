// preload.js

const { contextBridge, ipcRenderer } = require("electron");

// No fileTransformer here

// API methods as usual
const apiMethods = [
  "get-setup-list",
  "load-setup-yaml",
  "ensure-markdown-dir",
  "list-markdown-files",
  "load-markdown-file",
  "load-meta",
  "save-meta",
  "load-markdown",
  "save-markdown",
  "parse-markdown-to-fields",
  "generate-markdown-from-fields",
];

const api = {};

for (const method of apiMethods) {
  api[camelCase(method)] = (...args) => {
    return ipcRenderer.invoke(method, ...args);
  };
}

contextBridge.exposeInMainWorld("api", api);

// Config API
const configMethods = [
  "load-user-config",
  "save-user-config",
  "update-user-config",
];

const configAPI = {};

for (const method of configMethods) {
  configAPI[camelCase(method)] = (...args) => {
    return ipcRenderer.invoke(method, ...args);
  };
}

contextBridge.exposeInMainWorld("configAPI", configAPI);

function camelCase(str) {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}
