// controls/ipcRegistry.js

const {
  dialog,
  shell,
  clipboard,
  ipcMain,
  BrowserWindow,
  app,
} = require("electron");
const path = require("path");
const { registerIpc } = require("./ipcRoutes");
const { SingleFileRepository } = require("./sfr");
const { exec } = require("child_process");

const encryption = require("./encryption");
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

/** Resolve app icon path per platform (dev vs packaged) */
function pickIcon() {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "assets")
    : path.join(__dirname, "../assets"); // adjust if file moves
  if (process.platform === "win32") return path.join(base, "formidable.ico");
  if (process.platform === "darwin") return path.join(base, "formidable.icns");
  return path.join(base, "formidable.png"); // linux
}

/** Decide whether a URL is internal to the Formidable internal server */
function isInternal(url) {
  // localhost/127.0.0.1 on any port; extend if you bind to other hosts
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url);
}

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
  ipcMain.handle(
    "system:open-external",
    async (e, { url, variant = "external" }) => {
      if (!url) return;

      if (variant === "tab") {
        const win = new BrowserWindow({
          width: 1200,
          height: 800,
          show: true,
          icon: pickIcon(), // ← give the tab window your app icon
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        });

        // Any window.open: internal => navigate in-place; external => system browser
        win.webContents.setWindowOpenHandler(({ url: target }) => {
          if (isInternal(target)) {
            win.loadURL(target);
          } else {
            shell.openExternal(target);
          }
          return { action: "deny" };
        });

        // Also guard normal navigations (non-_blank) to external sites
        win.webContents.on("will-navigate", (event, target) => {
          if (!isInternal(target)) {
            event.preventDefault();
            shell.openExternal(target);
          }
        });

        await win.loadURL(url);
        return;
      }

      // Default: system browser
      await shell.openExternal(url);
    }
  );
  ipcMain.handle("clipboard-write", (e, text) => clipboard.writeText(text));
  ipcMain.handle("clipboard-read", () => clipboard.readText());

  ipcMain.handle("get-app-info", () => {
    return {
      name: packageJson.name,
      version: packageJson.version,
    };
  });

  ipcMain.handle("proxy-fetch-remote", async (e, { url, options }) => {
    try {
      return await pluginManager.fetchRemoteContent(url, options);
    } catch (err) {
      return {
        ok: false,
        status: 500,
        statusText: "Proxy fetch failed",
        body: err.message || "Unknown error",
      };
    }
  });

  // Encryption
  registerIpc("encrypt", (e, text) => encryption.encrypt(text));
  registerIpc("decrypt", (e, enc) => encryption.decrypt(enc));
  registerIpc("encryption-available", () => encryption.encryptionAvailable());

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
  registerIpc("get-plugin-ipc-map", () => pluginManager.getPluginIpcMap());

  // Help
  registerIpc("list-help-topics", (e, lang) =>
    helpManager.listHelpTopics(lang)
  );
  registerIpc("get-help-topic", (e, { id, lang }) =>
    helpManager.getHelpTopic(id, lang)
  );

  // Git
  registerIpc("is-git-repo", (e, folder) => gitManager.isGitRepo(folder));
  registerIpc("get-git-root", (e, folder) => gitManager.getGitRoot(folder));
  registerIpc("git-status", (e, folder) => gitManager.status(folder));
  registerIpc("git-remote-info", (e, folder) => gitManager.remoteInfo(folder));
  registerIpc("git-pull", (e, folder) => gitManager.pull(folder));
  registerIpc("git-push", (e, folder) => gitManager.push(folder));
  registerIpc("git-commit", (e, folder, msg, opts) =>
    gitManager.commit(folder, msg, {
      addAllBeforeCommit: true,
      ...(opts || {}),
    })
  );
  registerIpc("git-discard", (e, { folderPath, filePath }) =>
    gitManager.discardFile(folderPath, filePath)
  );
  registerIpc("git-fetch", (e, folder, remote, opts) =>
    gitManager.fetch(folder, remote, opts)
  );
  registerIpc("git-set-upstream", (e, folder, remote, branch) =>
    gitManager.setUpstream(folder, remote, branch)
  );
  registerIpc("git-add-all", (e, folder) => gitManager.addAll(folder));
  registerIpc("git-add-paths", (e, folder, paths) =>
    gitManager.addPaths(folder, paths)
  );
  registerIpc("git-reset-paths", (e, folder, paths) =>
    gitManager.resetPaths(folder, paths)
  );
  registerIpc("git-commit-paths", (e, folder, message, paths) =>
    gitManager.commitPaths(folder, message, paths)
  );
  registerIpc("git-branches", (e, folder) => gitManager.branches(folder));
  registerIpc("git-branch-create", (e, folder, name, opts) =>
    gitManager.createBranch(folder, name, opts)
  );
  registerIpc("git-checkout", (e, folder, ref) =>
    gitManager.checkout(folder, ref)
  );
  registerIpc("git-branch-delete", (e, folder, name, force) =>
    gitManager.deleteBranch(folder, name, { force })
  );
  registerIpc("git-diff-name-only", (e, folder, base) =>
    gitManager.diffNameOnly(folder, base)
  );
  registerIpc("git-diff-file", (e, folder, file, base) =>
    gitManager.diffFile(folder, file, base)
  );
  registerIpc("git-log", (e, folder, opts) =>
    gitManager.logCommits(folder, opts)
  );
  registerIpc("git-reset-hard", (e, folder, ref) =>
    gitManager.resetHard(folder, ref)
  );
  registerIpc("git-revert", (e, folder, hash, opts) =>
    gitManager.revertCommit(folder, hash, opts)
  );
  registerIpc("git-merge", (e, folder, ref) => gitManager.merge(folder, ref));
  registerIpc("git-merge-abort", (e, folder) => gitManager.mergeAbort(folder));
  registerIpc("git-merge-continue", (e, folder) =>
    gitManager.mergeContinue(folder)
  );
  registerIpc("git-rebase-start", (e, folder, upstream) =>
    gitManager.rebaseStart(folder, upstream)
  );
  registerIpc("git-rebase-continue", (e, folder) =>
    gitManager.rebaseContinue(folder)
  );
  registerIpc("git-rebase-abort", (e, folder) =>
    gitManager.rebaseAbort(folder)
  );
  registerIpc("git-conflicts", (e, folder) =>
    gitManager.getConflictedFiles(folder)
  );
  registerIpc("git-progress-state", (e, folder) =>
    gitManager.getProgressState(folder)
  );
  registerIpc("git-choose-ours", (e, folder, file) =>
    gitManager.chooseOurs(folder, file)
  );
  registerIpc("git-choose-theirs", (e, folder, file) =>
    gitManager.chooseTheirs(folder, file)
  );
  registerIpc("git-mark-resolved", (e, folder, file) =>
    gitManager.markResolved(folder, file)
  );
  registerIpc("git-revert-resolution", (e, folder, file) =>
    gitManager.revertResolution(folder, file)
  );
  registerIpc("git-continue-any", (e, folder) =>
    gitManager.continueAny(folder)
  );
  registerIpc("git-sync", (e, folder, remote, branch) =>
    gitManager.sync(folder, remote, branch)
  );
  registerIpc("git-mergetool", (e, folder, file) =>
    gitManager.openMergetool(folder, file)
  );
  registerIpc("git-open-in-vscode", (e, folder, file) =>
    gitManager.openInVSCode(folder, file)
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
  registerIpc("seed-basic-template-if-empty", () =>
    templateManager.seedBasicTemplateIfEmpty()
  );
  registerIpc("get-item-fields", (e, name) =>
    templateManager.getPossibleItemFields(name)
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
  registerIpc("parse-frontmatter", (e, markdown) =>
    markdownRenderer.parseFrontmatter(markdown)
  );
  registerIpc("build-frontmatter", (e, data, body = "") =>
    markdownRenderer.buildFrontmatter(data, body)
  );
  registerIpc("filter-frontmatter", (e, data, keys = []) =>
    markdownRenderer.filterFrontmatter(data, keys)
  );

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
  registerIpc("ensure-directory", (e, opts = {}) => {
    const { dirPath, ...rest } = opts;
    return fileManager.ensureDirectory(dirPath, rest);
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
  registerIpc("empty-folder", (e, dirPath) => fileManager.emptyFolder(dirPath));
  registerIpc("file-exists", (e, filePath) => fileManager.fileExists(filePath));
  registerIpc("save-image-file", async (e, storageLocation, fileName, buffer) =>
    fileManager.saveImageFile(storageLocation, fileName, buffer)
  );
  registerIpc("copy-folder", (e, { from, to, overwrite }) => {
    return {
      success: fileManager.copyFolderRecursive(from, to, overwrite),
    };
  });
  registerIpc("copy-file", (e, { from, to, overwrite = true }) => {
    const result = fileManager.copyFile(from, to, { overwrite });
    return result;
  });
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
