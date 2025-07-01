// controls/pluginManager.js

const { log, error } = require("./nodeLogger");
const fileManager = require("./fileManager");
const pluginSchema = require("../schemas/plugin.schema.js");

const pluginRepo = Object.create(null);

function getPluginRoot() {
  return fileManager.resolvePath("plugins");
}

function ensurePluginFolder() {
  fileManager.ensureDirectory(getPluginRoot(), {
    label: "PluginManager",
    silent: true,
  });
}

// ─────────────────────────────────────────────────────────────
// Load all plugins: reads plugin.json and optionally plugin.js
// ─────────────────────────────────────────────────────────────
function loadPlugins() {
  ensurePluginFolder();

  const entries = fileManager.listDirectoryEntries(getPluginRoot(), { silent: true });
  const folders = entries.filter((e) => e.isDirectory).map((e) => e.name);

  log(`[PluginManager] Found ${folders.length} plugin folder(s)`);

  for (const folder of folders) {
    const pluginDir = fileManager.joinPath(getPluginRoot(), folder);
    const pluginPath = fileManager.joinPath(pluginDir, "plugin.js");
    const metaPath = fileManager.joinPath(pluginDir, "plugin.json");

    try {
      if (!fileManager.fileExists(metaPath)) {
        log(`[PluginManager] Skipping "${folder}" (no plugin.json)`);
        continue;
      }

      const meta = fileManager.loadFile(metaPath, { format: "json", silent: true });

      let run = null;
      if (fileManager.fileExists(pluginPath)) {
        delete require.cache[require.resolve(pluginPath)];
        const pluginExport = require(pluginPath);
        run = typeof pluginExport.run === "function" ? pluginExport.run : pluginExport;
      }

      const pluginDef = { ...meta, run };
      const plugin = pluginSchema.sanitize({ name: folder, ...pluginDef }, folder);

      pluginRepo[plugin.name] = plugin;
      log(`[PluginManager] Registered plugin: ${plugin.name} (${plugin.version})`);
    } catch (err) {
      error(`[PluginManager] Failed to load plugin "${folder}":`, err.message);
    }
  }
}

function runPlugin(name, context = {}) {
  const plugin = pluginRepo[name];
  if (!plugin || typeof plugin.run !== "function") {
    error(`[PluginManager] Plugin not found or not executable: ${name}`);
    return null;
  }

  try {
    const result = plugin.run(context);
    log(`[PluginManager] Plugin "${name}" executed successfully.`);
    return result;
  } catch (err) {
    error(`[PluginManager] Plugin "${name}" crashed:`, err.message);
    return null;
  }
}

function listPlugins() {
  return Object.keys(pluginRepo).map((name) => {
    const { version, description = "", author = "", tags = [], enabled } = pluginRepo[name];
    return { name, version, description, author, tags, enabled };
  });
}

function reloadPlugins() {
  for (const key in pluginRepo) delete pluginRepo[key];
  loadPlugins();
}

function uploadPlugin(folderName, jsContent, meta = null) {
  ensurePluginFolder();

  const safeName = folderName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const pluginDir = fileManager.joinPath(getPluginRoot(), safeName);
  const pluginFile = fileManager.joinPath(pluginDir, "plugin.js");
  const metaFile = fileManager.joinPath(pluginDir, "plugin.json");

  try {
    fileManager.ensureDirectory(pluginDir, { label: `Plugin<${safeName}>`, silent: true });
    fileManager.saveFile(pluginFile, jsContent, { format: "text", silent: false });

    if (meta && typeof meta === "object") {
      fileManager.saveFile(metaFile, meta, { format: "json", silent: true });
    }

    log(`[PluginManager] Uploaded plugin to "${safeName}"`);
    reloadPlugins();
    return { success: true, message: `Plugin "${safeName}" uploaded.` };
  } catch (err) {
    error(`[PluginManager] Failed to upload plugin "${safeName}":`, err.message);
    return { success: false, error: err.message };
  }
}

function createPlugin(folderName) {
  ensurePluginFolder();

  const safeName = folderName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const pluginDir = fileManager.joinPath(getPluginRoot(), safeName);
  const pluginFile = fileManager.joinPath(pluginDir, "plugin.js");
  const metaFile = fileManager.joinPath(pluginDir, "plugin.json");

  const boilerplateCode = `// plugins/${safeName}/plugin.js
exports.run = function (context) {
  console.log("Hello from ${safeName}!");
  return { message: "Hello World", context };
};`;

  const boilerplateMeta = {
    name: safeName,
    version: "1.0.0",
    description: "A new plugin",
    author: "Unknown",
    tags: [],
    enabled: true,
  };

  try {
    fileManager.ensureDirectory(pluginDir, { label: `Plugin<${safeName}>`, silent: true });
    fileManager.saveFile(pluginFile, boilerplateCode, { format: "text", silent: false });
    fileManager.saveFile(metaFile, boilerplateMeta, { format: "json", silent: true });

    log(`[PluginManager] Created plugin "${safeName}"`);
    reloadPlugins();
    return { success: true, message: `Plugin "${safeName}" created.` };
  } catch (err) {
    error(`[PluginManager] Failed to create plugin "${safeName}":`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  loadPlugins,
  runPlugin,
  listPlugins,
  reloadPlugins,
  uploadPlugin,
  createPlugin,
};