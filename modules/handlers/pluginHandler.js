// modules/handlers/pluginHandler.js

import { EventBus } from "../eventBus.js";
import { t, tLow } from "../../utils/i18n.js";

// ─────────────────────────────────────────────────────────────
// Persistent plugin event registry (FIX: survives reloads)
// ─────────────────────────────────────────────────────────────
const boundPluginEvents =
  window.__pluginRegistry_boundEvents ||
  (window.__pluginRegistry_boundEvents = new Map());

function clearPluginBindings() {
  for (const [eventName, handler] of boundPluginEvents.entries()) {
    EventBus.off(eventName, handler); // Proper unbinding
  }
  boundPluginEvents.clear();
}

// ─────────────────────────────────────────────────────────────
// Plugin Handlers
// ─────────────────────────────────────────────────────────────

export async function autoBindPluginEvents(_, callback) {
  try {
    // Clear all previous plugin event bindings
    clearPluginBindings();

    if (typeof window.api.plugin.rebindPluginMethods !== "function") {
      EventBus.emit("logging:warning", [
        "[PluginHandler] rebindPluginMethods not available.",
      ]);
      callback?.(false);
      return;
    }

    const pluginMap = await window.api.plugin.rebindPluginMethods();

    for (const [pluginName, methods] of Object.entries(pluginMap || {})) {
      for (const method of methods) {
        const eventName = `plugin:${pluginName}:${method}`;

        // Prevent duplicate binding
        if (boundPluginEvents.has(eventName)) {
          console.warn(
            `[PluginHandler] Skipping already-bound event: ${eventName}`
          );
          continue;
        }

        const handler = async (args, cb) => {
          try {
            const result = await window.api.plugin[pluginName][method](args);
            cb?.(result);
          } catch (err) {
            EventBus.emit("logging:error", [
              `[PluginHandler] ${eventName} failed:`,
              err,
            ]);
            cb?.({ error: err.message });
          }
        };

        EventBus.on(eventName, handler);
        boundPluginEvents.set(eventName, handler);
      }
    }

    EventBus.emit("logging:default", [
      "[PluginHandler] Auto-bound plugin events:",
      pluginMap,
    ]);

    callback?.(true);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[PluginHandler] autoBindPluginEvents failed:",
      err,
    ]);
    callback?.(false);
  }
}

export async function handleGetPluginPath(_, callback) {
  try {
    const path = await window.api.plugin.getPluginsPath();
    callback?.(path);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[PluginHandler] getPluginsPath failed:",
      err,
    ]);
    callback?.(null);
  }
}

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
      languageKey: "toast.plugin.run",
      args: [name, target],
      variant,
    });

    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[PluginHandler] runPlugin "${name}" failed:`,
      err,
    ]);

    EventBus.emit("ui:toast", {
      languageKey: "toast.plugin.crashed",
      args: [name, target],
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
    await EventBus.emit("plugin:autobind");
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

export async function handleCreatePlugin(
  { folder, target = "frontend" },
  callback
) {
  EventBus.emit("logging:default", [
    `[PluginHandler] Creating plugin: "${folder}" with target: "${target}"`,
  ]);

  try {
    const result = await window.api.plugin.createPlugin({ folder, target });
    EventBus.emit("logging:default", [
      `[PluginHandler] Plugin "${folder}" created successfully:`,
      result,
    ]);
    callback?.(result);
  } catch (err) {
    console.error("[PluginHandler] createPlugin failed:", err);
    callback?.({ success: false, error: err.message });
  }
}

export async function handleDeletePlugin({ folder }, callback) {
  try {
    const result = await window.api.plugin.deletePlugin(folder);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[PluginHandler] deletePlugin "${folder}" failed:`,
      err,
    ]);
    callback?.({ success: false, error: err.message });
  }
}

export async function handleUpdatePlugin({ folder, updates }) {
  try {
    const result = await window.api.plugin.updatePlugin({ folder, updates });
    return result;
  } catch (err) {
    EventBus.emit("logging:error", [
      `[PluginHandler] updatePlugin "${folder}" failed:`,
      err,
    ]);
    return { success: false, error: err.message };
  }
}

export async function handleGetPluginSettings({ name }, callback) {
  try {
    const settings = await window.api.plugin.getPluginSettings(name);
    callback?.(settings);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[PluginHandler] getPluginSettings "${name}" failed:`,
      err,
    ]);
    callback?.({});
  }
}

export async function handleSavePluginSettings({ name, settings }, callback) {
  try {
    const result = await window.api.plugin.savePluginSettings({
      name,
      settings,
    });
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[PluginHandler] savePluginSettings "${name}" failed:`,
      err,
    ]);
    callback?.({ success: false, error: err.message });
  }
}

export async function handlePluginProxyFetch(payload, callback) {
  const { url, options = {} } = payload || {};

  if (!url || typeof url !== "string") {
    const msg = "Invalid or missing URL in proxy fetch payload";
    callback?.({ success: false, error: msg });
    return;
  }

  try {
    const result = await window.api.system.proxyFetchRemote(url, options);
    callback?.({ success: true, content: result });
  } catch (err) {
    callback?.({ success: false, error: err.message || "Unknown error" });
  }
}
