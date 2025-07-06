// modules/handlers/systemHandler.js

import { EventBus } from "../eventBus.js";

export async function handleResolvePath({ segments = [] }) {
  try {
    const result = await window.api.system.resolvePath(...segments);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", [
      "[SystemHandler] resolvePath failed:",
      err,
    ]);
    return null;
  }
}

export async function handleEnsureDirectory({ dirPath, label = null }) {
  try {
    const result = await window.api.system.ensureDirectory(dirPath, label);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", [
      `[SystemHandler] ensureDirectory failed for "${dirPath}":`,
      err,
    ]);
    return false;
  }
}

export async function handleSaveFile({ filepath, data, opts = {} }) {
  try {
    const result = await window.api.system.saveFile(filepath, data, opts);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", [
      `[SystemHandler] saveFile "${filepath}" failed:`,
      err,
    ]);
    return { success: false, error: err.message };
  }
}

export async function handleLoadFile({ filepath, opts = {} }) {
  try {
    const result = await window.api.system.loadFile(filepath, opts);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", [
      `[SystemHandler] loadFile "${filepath}" failed:`,
      err,
    ]);
    return null;
  }
}

export async function handleDeleteFile({ filepath, opts = {} }) {
  try {
    const result = await window.api.system.deleteFile(filepath, opts);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", [
      `[FileHandler] deleteFile "${filepath}" failed:`,
      err,
    ]);
    return { success: false, error: err.message };
  }
}

export async function handleFileExists({ path }) {
  try {
    const exists = await window.api.system.fileExists(path);
    return exists;
  } catch (err) {
    EventBus.emit("logging:error", [
      `[FileHandler] fileExists check failed for "${path}":`,
      err,
    ]);
    return false;
  }
}

export async function handleOpenExternal({ url }) {
  try {
    await window.api.system.openExternal(url);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[SystemHandler] openExternal failed for "${url}":`,
      err,
    ]);
  }
}

export async function handleExecuteCommand({ cmd }) {
  try {
    const result = await window.api.system.executeCommand(cmd);
    return result;
  } catch (err) {
    EventBus.emit("logging:error", [
      `[SystemHandler] executeCommand failed for "${cmd}":`,
      err,
    ]);
    return {
      success: false,
      error: err.message,
    };
  }
}