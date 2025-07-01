// modules/handlers/pluginHandler.js

import { EventBus } from "../eventBus.js";

export async function handleListPlugins(_, callback) {
  try {
    const list = await window.api.plugin.listPlugins();
    console.log("Loaded plugin list:", list); // 👈 add this for debugging
    callback?.(list);
  } catch (err) {
    EventBus.emit("logging:error", ["[PluginHandler] listPlugins failed:", err]);
    callback?.([]);
  }
}

export async function handleRunPlugin({ name, context = {} }, callback) {
  try {
    const result = await window.api.plugin.runPlugin(name, context);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [`[PluginHandler] runPlugin "${name}" failed:`, err]);
    callback?.(null);
  }
}

export async function handleReloadPlugins(_, callback) {
  try {
    const list = await window.api.plugin.reloadPlugins();
    console.log("Loaded plugin list:", list);
    callback?.(list);
  } catch (err) {
    EventBus.emit("logging:error", ["[PluginHandler] reloadPlugins failed:", err]);
    callback?.([]);
  }
}

export async function handleUploadPlugin({ folder, js, meta }, callback) {
  try {
    const result = await window.api.plugin.uploadPlugin(folder, js, meta);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", ["[PluginHandler] uploadPlugin failed:", err]);
    callback?.({ success: false, error: err.message });
  }
}

export async function handleCreatePlugin({ folder }, callback) {
  console.log(`[PluginHandler] Creating plugin: "${folder}"`);

  try {
    const result = await window.api.plugin.createPlugin(folder);
    console.log(`[PluginHandler] Plugin "${folder}" created successfully:`, result);
    callback?.(result);
  } catch (err) {
    console.error("[PluginHandler] createPlugin failed:", err);
    callback?.({ success: false, error: err.message });
  }
}
