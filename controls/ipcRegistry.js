// controls/ipcRegistry.js

const {
  dialog,
  shell,
  clipboard,
  ipcMain,
  BrowserWindow,
} = require("electron");
const { registerIpc } = require("./ipcRoutes");

const fileManager = require("./fileManager");
const templateManager = require("./templateManager");
const formManager = require("./formManager");
const configManager = require("./configManager");
const markdownManager = require("./markdownManager");
const markdownRenderer = require("./markdownRenderer");
const htmlRenderer = require("./htmlRenderer");

function registerIpcHandlers() {
  // System
  ipcMain.handle("app-quit", () => process.exit(0));
  ipcMain.handle("toggle-devtools", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const wc = win.webContents;
      wc.isDevToolsOpened() ? wc.closeDevTools() : wc.openDevTools();
    }
  });

  ipcMain.on("window-reload", (e) =>
    BrowserWindow.fromWebContents(e.sender)?.reload()
  );
  ipcMain.on("window-minimize", (e) =>
    BrowserWindow.fromWebContents(e.sender)?.minimize()
  );
  ipcMain.on("window-maximize", (e) =>
    BrowserWindow.fromWebContents(e.sender)?.maximize()
  );
  ipcMain.on("window-close", (e) =>
    BrowserWindow.fromWebContents(e.sender)?.close()
  );

  ipcMain.handle("shell-open-path", (e, path) => shell.openPath(path));
  ipcMain.handle("shell-open-external", (e, url) => shell.openExternal(url));
  ipcMain.handle("clipboard-write", (e, text) => clipboard.writeText(text));
  ipcMain.handle("clipboard-read", () => clipboard.readText());

  // Templates
  registerIpc("list-templates", () => templateManager.listTemplates());
  registerIpc("load-template", (e, name) => templateManager.loadTemplate(name));
  registerIpc("save-template", (e, name, data) =>
    templateManager.saveTemplate(name, data)
  );
  registerIpc("delete-template", (e, name) =>
    templateManager.deleteTemplate(name)
  );
  registerIpc("get-template-descriptor", (e, name) =>
    templateManager.getTemplateDescriptor(name)
  );
  registerIpc("create-basic-template", () =>
    templateManager.createBasicTemplateIfMissing()
  );

  // Forms
  registerIpc("ensure-form-dir", (e, dir) =>
    formManager.ensureFormDirectory(dir)
  );
  registerIpc("list-forms", (e, dir) => formManager.listForms(dir));
  registerIpc("load-form", (e, dir, file, fields) =>
    formManager.loadForm(dir, file, fields)
  );
  registerIpc("save-form", (e, dir, file, data, fields) =>
    formManager.saveForm(dir, file, data, fields)
  );
  registerIpc("delete-form", (e, dir, file) =>
    formManager.deleteForm(dir, file)
  );

  // Markdown
  registerIpc("ensure-markdown-dir", (e, dir) =>
    markdownManager.ensureMarkdownDirectory(dir)
  );
  registerIpc("list-markdowns", (e, dir) =>
    markdownManager.listMarkdownFiles(dir)
  );
  registerIpc("load-markdown", (e, dir, file) =>
    markdownManager.loadMarkdownFile(dir, file)
  );
  registerIpc("save-markdown", (e, dir, file, data) =>
    markdownManager.saveMarkdownFile(dir, file, data)
  );
  registerIpc("delete-markdown", (e, dir, file) =>
    markdownManager.deleteMarkdownFile(dir, file)
  );

  // Config
  registerIpc("load-user-config", () => configManager.loadUserConfig());
  registerIpc("save-user-config", (e, cfg) =>
    configManager.saveUserConfig(cfg)
  );
  registerIpc("update-user-config", (e, partial) =>
    configManager.updateUserConfig(partial)
  );

  // Render
  registerIpc("render-markdown-template", (e, data, yaml) =>
    markdownRenderer.renderMarkdown(data, yaml)
  );
  registerIpc("render-html-preview", (e, md) => htmlRenderer.renderHtml(md));

  // File & Dialog
  registerIpc("dialog-choose-directory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  registerIpc("get-app-root", () => fileManager.getAppRoot());
  registerIpc("resolve-path", (e, ...segments) =>
    fileManager.resolvePath(...segments)
  );
  registerIpc("file-exists", (e, filePath) => fileManager.fileExists(filePath));
}

module.exports = { registerIpcHandlers };
