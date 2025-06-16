// modules/handlers/gitHandler.js

import { EventBus } from "../eventBus.js";

export async function handleGitCheckRepo({ folderPath, callback }) {
  try {
    const isRepo = await window.api.git.isGitRepo(folderPath);
    callback?.(isRepo);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to check Git repo:",
      err,
    ]);
    callback?.(false);
  }
}

export async function handleGitGetRoot({ folderPath, callback }) {
  try {
    const root = await window.api.git.getGitRoot(folderPath);
    callback?.(root);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to get Git root:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitStatus({ folderPath, callback }) {
  try {
    const status = await window.api.git.gitStatus(folderPath);
    callback?.(status);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to get Git status:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitPull({ folderPath, callback }) {
  try {
    const result = await window.api.git.gitPull(folderPath);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to pull Git repo:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitPush({ folderPath, callback }) {
  try {
    const result = await window.api.git.gitPush(folderPath);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to push Git repo:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitCommit({ folderPath, message, callback }) {
  try {
    const result = await window.api.git.gitCommit(folderPath, message);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to commit to Git repo:",
      err,
    ]);
    callback?.(null);
  }
}
