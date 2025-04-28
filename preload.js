// preload.js

const { contextBridge, ipcRenderer } = require("electron");

// No logger here! Only simple console.log if needed manually.

contextBridge.exposeInMainWorld("api", {
  getSetupList: () => ipcRenderer.invoke("get-setup-list"),
  loadSetupYaml: (name) => ipcRenderer.invoke("load-setup-yaml", name),
  ensureMarkdownDir: (dir) => ipcRenderer.invoke("ensure-markdown-dir", dir),
  saveMarkdown: (directory, filename, data) => ipcRenderer.invoke("save-markdown", directory, filename, data),
  listMarkdownFiles: (directory) => ipcRenderer.invoke("list-markdown-files", directory),
  loadMarkdownFile: (args) => {
    if (!args || typeof args !== "object" || !args.dir || !args.filename) {
      console.error("[Preload] loadMarkdownFile called with invalid args:", args);
      throw new Error("Invalid arguments for loadMarkdownFile");
    }
    return ipcRenderer.invoke("load-markdown-file", args);
  },
});

contextBridge.exposeInMainWorld("configAPI", {
  loadUserConfig: () => ipcRenderer.invoke("load-user-config"),
  saveUserConfig: (cfg) => ipcRenderer.invoke("save-user-config", cfg),
  updateUserConfig: (partial) => ipcRenderer.invoke("update-user-config", partial),
});
