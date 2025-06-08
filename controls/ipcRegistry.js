// controls/ipcRegistry.js

const {
  dialog,
  shell,
  clipboard,
  ipcMain,
  BrowserWindow,
} = require("electron");
const { registerIpc } = require("./ipcRoutes");
const { SingleFileRepository } = require("./sfr");

const packageJson = require("../package.json");
const fileManager = require("./fileManager");
const templateManager = require("./templateManager");
const formManager = require("./formManager");
const configManager = require("./configManager");
const markdownManager = require("./markdownManager");
const markdownRenderer = require("./markdownRenderer");
const htmlRenderer = require("./htmlRenderer");

const sfr = new SingleFileRepository();

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

  ipcMain.handle("sfr:listFiles", (e, dir) => sfr.listFiles(dir));
  ipcMain.handle("sfr:loadFromBase", (e, dir, file, opts) =>
    sfr.loadFromBase(dir, file, opts)
  );
  ipcMain.handle("sfr:saveFromBase", (e, dir, file, data, opts) =>
    sfr.saveFromBase(dir, file, data, opts)
  );
  ipcMain.handle("sfr:deleteFromBase", (e, dir, file, opts) =>
    sfr.deleteFromBase(dir, file, opts)
  );

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

  ipcMain.handle("get-app-info", () => {
    return {
      name: packageJson.name,
      version: packageJson.version,
    };
  });

  // Templates
  registerIpc("list-templates", () => templateManager.listTemplates());
  registerIpc("load-template", (e, name) => templateManager.loadTemplate(name));
  registerIpc("save-template", (e, name, data) =>
    templateManager.saveTemplate(name, data)
  );
  registerIpc("delete-template", (e, name) =>
    templateManager.deleteTemplate(name)
  );
  registerIpc("validate-template", (e, template) =>
    templateManager.validateTemplate(template)
  );
  registerIpc("get-template-descriptor", (e, name) =>
    templateManager.getTemplateDescriptor(name)
  );
  registerIpc("create-basic-template", () =>
    templateManager.createBasicTemplateIfMissing()
  );

  // Forms (refactored for template-based VFS)
  registerIpc("ensure-form-dir", (e, templateFilename) =>
    formManager.ensureFormDirectory(templateFilename)
  );
  registerIpc("list-forms", (e, templateFilename) =>
    formManager.listForms(templateFilename)
  );
  registerIpc("load-form", (e, templateFilename, dataFile, fields) =>
    formManager.loadForm(templateFilename, dataFile, fields)
  );
  registerIpc("save-form", (e, templateFilename, dataFile, data, fields) =>
    formManager.saveForm(templateFilename, dataFile, data, fields)
  );
  registerIpc("delete-form", (e, templateFilename, dataFile) =>
    formManager.deleteForm(templateFilename, dataFile)
  );
  // This one still uses raw storageLocation (not templateFilename), so leave as-is for now:
  registerIpc("save-image-file", async (e, storageLocation, fileName, buffer) =>
    fileManager.saveImageFile(storageLocation, fileName, buffer)
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
  registerIpc("switch-user-profile", (e, profileFilename) =>
    configManager.switchUserProfile(profileFilename)
  );
  registerIpc("load-user-config", () => configManager.loadUserConfig());
  registerIpc("update-user-config", (e, partial) =>
    configManager.updateUserConfig(partial)
  );
  registerIpc("invalidate-config-cache", () =>
    configManager.invalidateConfigCache()
  );
  registerIpc("get-virtual-structure", () =>
    configManager.getVirtualStructure()
  );
  registerIpc("get-context-path", () => configManager.getContextPath());
  registerIpc("get-templates-folder", () =>
    configManager.getContextTemplatesPath()
  );
  registerIpc("get-storage-folder", () =>
    configManager.getContextStoragePath()
  );
  registerIpc("get-template-storage-info", (e, templateFilename) =>
    configManager.getTemplateStorageInfo(templateFilename)
  );
  registerIpc("get-template-storage-folder", (e, templateFilename) =>
    configManager.getTemplateStoragePath(templateFilename)
  );
  registerIpc("get-template-meta-files", (e, templateFilename) =>
    configManager.getTemplateMetaFiles(templateFilename)
  );
  registerIpc("get-template-image-files", (e, templateFilename) =>
    configManager.getTemplateImageFiles(templateFilename)
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
