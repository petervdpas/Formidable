// modules/handlers/pluginHandler.js

import { EventBus } from "../eventBus.js";

export async function runFrontendPlugin(name, context = {}) {
  const result = await window.api.plugin.getPluginCode(name);

  if (!result.success) {
    EventBus.emit("logging:error", [
      `[Plugin] Failed to load "${name}": ${result.error}`,
    ]);
    return { success: false, error: result.error };
  }

  const blob = new Blob([result.code], { type: "text/javascript" });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const module = await import(blobUrl);
    if (typeof module.run === "function") {
      const output = await module.run(context);
      EventBus.emit("logging:default", [
        `[Plugin] Output from "${name}":`,
        output,
      ]);
      return { success: true, output };
    } else {
      EventBus.emit("logging:warning", [
        `[Plugin] "${name}" has no exported 'run' function.`,
      ]);
      return { success: false, error: "No 'run' function found." };
    }
  } catch (err) {
    EventBus.emit("logging:error", [
      `[Plugin] Failed to execute "${name}":`,
      err,
    ]);
    return { success: false, error: err.message };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export async function handleListPlugins(_, callback) {
  try {
    const list = await window.api.plugin.listPlugins();
    console.log("Loaded plugin list:", list); // 👈 add this for debugging
    callback?.(list);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[PluginHandler] listPlugins failed:",
      err,
    ]);
    callback?.([]);
  }
}

export async function handleRunPlugin(
  { name, context = {}, target },
  callback
) {
  try {
    let result;

    if (target === "frontend") {
      result = await runFrontendPlugin(name, context);
    } else {
      result = await window.api.plugin.runPlugin(name, context);
    }

    const variant = result?.error ? "error" : "success";

    EventBus.emit("ui:toast", {
      message: `Plugin run: ${name} (${target})`,
      variant,
    });

    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[PluginHandler] runPlugin "${name}" failed:`,
      err,
    ]);

    EventBus.emit("ui:toast", {
      message: `Plugin "${name}" (${target}) crashed.`,
      variant: "error",
    });

    callback?.({ error: err.message });
  }
}

export async function handleGetPluginCode({ name }, callback) {
  try {
    const result = await window.api.plugin.getPluginCode(name);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[PluginHandler] getPluginCode "${name}" failed:`,
      err,
    ]);
    callback?.({ success: false, error: err.message });
  }
}

export async function handleReloadPlugins(_, callback) {
  try {
    const list = await window.api.plugin.reloadPlugins();
    console.log("Loaded plugin list:", list);
    callback?.(list);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[PluginHandler] reloadPlugins failed:",
      err,
    ]);
    callback?.([]);
  }
}

export async function handleUploadPlugin({ folder, js, meta }, callback) {
  try {
    const result = await window.api.plugin.uploadPlugin(folder, js, meta);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[PluginHandler] uploadPlugin failed:",
      err,
    ]);
    callback?.({ success: false, error: err.message });
  }
}

export async function handleCreatePlugin({ folder, target = "frontend" }, callback) {
  console.log(`[PluginHandler] Creating plugin: "${folder}" with target: "${target}"`);

  try {
    const result = await window.api.plugin.createPlugin({ folder, target });
    console.log(
      `[PluginHandler] Plugin "${folder}" created successfully:`,
      result
    );
    callback?.(result);
  } catch (err) {
    console.error("[PluginHandler] createPlugin failed:", err);
    callback?.({ success: false, error: err.message });
  }
}