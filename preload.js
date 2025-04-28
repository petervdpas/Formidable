// preload.js

const { contextBridge, ipcRenderer } = require("electron");

// Just list your API methods here:
const apiMethods = [
  "get-setup-list",
  "load-setup-yaml",
  "ensure-markdown-dir",
  "list-markdown-files",
  "load-markdown-meta",
  "load-markdown-file",
  "load-meta",
  "save-meta",
  "load-markdown",
  "save-markdown",
];

// Build the API object dynamically:
const api = {};

for (const method of apiMethods) {
  api[camelCase(method)] = (...args) => {
    return ipcRenderer.invoke(method, ...args);
  };
}

// Expose the API into the browser context
contextBridge.exposeInMainWorld("api", api);

// Same for configAPI separately if you want
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

// Helper: Convert "load-user-config" -> "loadUserConfig"
function camelCase(str) {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}
