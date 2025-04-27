// preload.js

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getSetupList: () => ipcRenderer.invoke("get-setup-list"),
  loadSetupYaml: (name) => ipcRenderer.invoke("load-setup-yaml", name),
  ensureMarkdownDir: (dir) => ipcRenderer.invoke("ensure-markdown-dir", dir),
  saveMarkdown: (directory, filename, data) => ipcRenderer.invoke("save-markdown", directory, filename, data),
});

contextBridge.exposeInMainWorld("configAPI", {
  loadUserConfig: () => ipcRenderer.invoke("load-user-config"),
  saveUserConfig: (cfg) => ipcRenderer.invoke("save-user-config", cfg),
  updateUserConfig: (partial) => ipcRenderer.invoke("update-user-config", partial),
});