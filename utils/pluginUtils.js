// utils/pluginUtils.js

import { EventBus } from "../modules/eventBus.js";

// Plugin Settings
export async function getPluginSettings(name) {
  return EventBus.emitWithResponse("plugin:get-settings", { name });
}

export async function savePluginSettings(name, settings) {
  return EventBus.emitWithResponse("plugin:save-settings", { name, settings });
}

// File I/O utilities
export async function resolvePath(...segments) {
  return EventBus.emitWithResponse("file:resolve", { segments });
}

export async function saveFile(filepath, data, opts = {}) {
  return EventBus.emitWithResponse("file:save", { filepath, data, opts });
}

export async function loadFile(filepath, opts = {}) {
  return EventBus.emitWithResponse("file:load", { filepath, opts });
}

export async function deleteFile(filepath, opts = {}) {
  return EventBus.emitWithResponse("file:delete", { filepath, opts });
}

export async function fileExists(path) {
  return EventBus.emitWithResponse("file:exists", { path });
}

export async function openExternal(url) {
  // This one does not need a response
  EventBus.emit("file:openExternal", { url });
}
