// modules/pluginManager.js

const { log, error } = require("./nodeLogger");
const fileManager = require("./fileManager");

const pluginRepo = {}; // Loaded plugins stored here

function loadPlugins(pluginDir) {
  const fullDir = fileManager.resolvePath(pluginDir);

  if (!fileManager.fileExists(fullDir)) {
    error("[PluginManager] Plugin directory not found:", fullDir);
    return;
  }

  const files = fileManager.listFilesByExtension(fullDir, ".js", { silent: true });
  log(`[PluginManager] Found ${files.length} plugin(s) in ${pluginDir}`);

  for (const file of files) {
    const fullPath = fileManager.joinPath(fullDir, file);

    try {
      const code = fileManager.loadFile(fullPath, { format: "text", silent: true });
      const pluginName = file.replace(/\.js$/, "");

      const pluginFunction = new Function("context", code + "; return runPlugin(context);");

      pluginRepo[pluginName] = pluginFunction;
      log(`[PluginManager] Loaded plugin: ${pluginName}`);
    } catch (err) {
      error(`[PluginManager] Failed to load plugin ${file}:`, err.message);
    }
  }
}

function runPlugin(name, context = {}) {
  const pluginFunc = pluginRepo[name];

  if (!pluginFunc) {
    error(`[PluginManager] Plugin not found: ${name}`);
    return null;
  }

  try {
    const result = pluginFunc(context);
    log(`[PluginManager] Plugin ${name} executed successfully.`);
    return result;
  } catch (err) {
    error(`[PluginManager] Plugin ${name} crashed:`, err.message);
    return null;
  }
}

function listPlugins() {
  return Object.keys(pluginRepo);
}

function reloadPlugins(pluginDir) {
  for (const key of Object.keys(pluginRepo)) {
    delete pluginRepo[key];
  }
  loadPlugins(pluginDir);
}

module.exports = {
  loadPlugins,
  runPlugin,
  listPlugins,
  reloadPlugins,
};