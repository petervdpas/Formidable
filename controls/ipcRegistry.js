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
const { exec } = require("child_process");

const internalServer = require("./internalServer");
const pluginManager = require("./pluginManager");
const helpManager = require("./helpManager");
const packageJson = require("../package.json");
const fileManager = require("./fileManager");
const gitManager = require("./gitManager");
const templateManager = require("./templateManager");
const formManager = require("./formManager");
const configManager = require("./configManager");
const markdownRenderer = require("./markdownRenderer");
const htmlRenderer = require("./htmlRenderer");
const miniExprParser = require("./miniExprParser");

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

  // Internal Server
  registerIpc("start-internal-server", (e, port) =>
    internalServer.startInternalServer(port)
  );
  registerIpc("stop-internal-server", () =>
    internalServer.stopInternalServer()
  );
  registerIpc("get-internal-server-status", () => internalServer.getStatus());

  // Plugins
  registerIpc("get-plugins-path", () => {
    return pluginManager.getPluginRoot();
  });
  registerIpc("list-plugins", () => pluginManager.listPlugins());
  registerIpc("run-plugin", (e, name, context = {}) => {
    if (typeof name !== "string") {
      throw new Error("Invalid plugin name");
    }
    return pluginManager.runPlugin(name, context);
  });
  registerIpc("get-plugin-code", (e, name) => {
    if (typeof name !== "string") {
      throw new Error("Invalid plugin name");
    }
    return pluginManager.getPluginCode(name); // should return { success, code, ... }
  });
  registerIpc("reload-plugins", () => {
    pluginManager.reloadPlugins();
    return pluginManager.listPlugins();
  });
  registerIpc("create-plugin", (e, args) => {
    if (typeof args === "string") {
      return pluginManager.createPlugin(args, "frontend");
    }

    if (typeof args === "object" && args !== null) {
      const folder = args.folder;
      const target = args.target || "frontend";
      return pluginManager.createPlugin(folder, target);
    }

    return { success: false, error: "Invalid arguments for plugin creation." };
  });
  registerIpc("delete-plugin", (e, name) => {
    if (typeof name !== "string") {
      return { success: false, error: "Invalid plugin name" };
    }
    return pluginManager.deletePlugin(name);
  });
  registerIpc("update-plugin", (e, args) => {
    const { folder, updates } = args || {};
    if (typeof folder !== "string" || typeof updates !== "object") {
      return { success: false, error: "Invalid arguments for update-plugin." };
    }
    return pluginManager.updatePlugin(folder, updates);
  });
  registerIpc("get-plugin-settings", (e, name) => {
    if (typeof name !== "string") {
      throw new Error("Invalid plugin name");
    }
    return pluginManager.getPluginSettings(name);
  });
  registerIpc("save-plugin-settings", (e, args) => {
    const { name, settings } = args || {};
    if (
      typeof name !== "string" ||
      typeof settings !== "object" ||
      settings === null
    ) {
      return {
        success: false,
        error: "Invalid arguments for saving plugin settings.",
      };
    }
    return pluginManager.savePluginSettings(name, settings);
  });

  registerIpc("proxy-fetch-remote", async (e, { url }) => {
    if (typeof url !== "string") {
      return { error: "Invalid URL" };
    }

    try {
      const result = await pluginManager.fetchRemoteContent(url);
      return result;
    } catch (err) {
      return { error: err.message || "Failed to fetch remote content" };
    }
  });

  // Help
  registerIpc("list-help-topics", () => helpManager.listHelpTopics());
  registerIpc("get-help-topic", (e, id) => helpManager.getHelpTopic(id));

  // Git
  registerIpc("is-git-repo", (e, folder) => gitManager.isGitRepo(folder));
  registerIpc("get-git-root", (e, folder) => gitManager.getGitRoot(folder));
  registerIpc("git-status", (e, folder) => gitManager.gitStatus(folder));
  registerIpc("git-remote-info", (e, folder) =>
    gitManager.getRemoteInfo(folder)
  );
  registerIpc("git-pull", (e, folder) => gitManager.gitPull(folder));
  registerIpc("git-push", (e, folder) => gitManager.gitPush(folder));
  registerIpc("git-commit", (e, folder, msg) =>
    gitManager.gitCommit(folder, msg)
  );
  registerIpc("git-discard", (e, { folderPath, filePath }) =>
    gitManager.gitDiscardFile(folderPath, filePath)
  );

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
  registerIpc("extended-list-forms", (e, templateFilename) =>
    formManager.extendedListForms(templateFilename)
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

  // Config
  registerIpc("switch-user-profile", (e, profileFilename) =>
    configManager.switchUserProfile(profileFilename)
  );
  registerIpc("list-user-profiles", () =>
    configManager.listAvailableProfiles()
  );
  registerIpc("current-profile-filename", () =>
    configManager.getCurrentProfileFilename()
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
  registerIpc("get-single-template-entry", (e, templateFilename) =>
    configManager.getSingleTemplateEntry(templateFilename)
  );

  // MiniExprParser
  registerIpc("parse-mini-expr", (e, expr, context) =>
    miniExprParser.parseMiniExpr(expr, context)
  );

  // Render
  registerIpc("render-markdown-template", (e, data, yaml, filePrefix = true) =>
    markdownRenderer.renderMarkdown(data, yaml, filePrefix)
  );
  registerIpc("render-html-preview", (e, md) => htmlRenderer.renderHtml(md));

  // File & Dialog
  registerIpc("dialog-choose-directory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  registerIpc("dialog-choose-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  registerIpc("get-app-root", () => fileManager.getAppRoot());
  registerIpc("ensure-directory", (e, { dirPath, label }) => {
    return fileManager.ensureDirectory(dirPath, { label });
  });
  registerIpc("resolve-path", (e, ...segments) =>
    fileManager.resolvePath(...segments)
  );
  registerIpc("save-file", (e, filepath, data, opts) =>
    fileManager.saveFile(filepath, data, opts)
  );
  registerIpc("load-file", (e, filepath, opts) =>
    fileManager.loadFile(filepath, opts)
  );
  registerIpc("delete-file", (e, filepath, opts) =>
    fileManager.deleteFile(filepath, opts)
  );
  registerIpc("file-exists", (e, filePath) => fileManager.fileExists(filePath));
  registerIpc("execute-command", async (e, cmd) => {
    return new Promise((resolve) => {
      exec(cmd, { shell: true }, (error, stdout, stderr) => {
        if (error) {
          resolve({
            success: false,
            error: error.message,
            stderr,
            stdout,
          });
        } else {
          resolve({
            success: true,
            stdout,
            stderr,
          });
        }
      });
    });
  });
}

module.exports = { registerIpcHandlers };
