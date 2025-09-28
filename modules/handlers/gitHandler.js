// modules/handlers/gitHandler.js

import { EventBus } from "../eventBus.js";

// Small helpers to keep things DRY
const unwrap = (res, fallback = null) => (res?.ok ? res.data : fallback);
const pass = (cb, res, fallback = null) => cb?.(unwrap(res, fallback));

export async function handleGitIsRepo({ folderPath, callback }) {
  try {
    const res = await window.api.git.isGitRepo(folderPath);
    callback?.(res?.ok ? !!res.data : false);
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
    const res = await window.api.git.getGitRoot(folderPath);
    pass(callback, res, null);
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
    const res = await window.api.git.gitStatus(folderPath);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to get Git status:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitRemoteInfo({ folderPath, callback }) {
  try {
    const res = await window.api.git.gitRemoteInfo(folderPath);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to get remote Git info:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitPull({ folderPath, callback }) {
  try {
    const res = await window.api.git.gitPull(folderPath);
    pass(callback, res, null);
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
    const res = await window.api.git.gitPush(folderPath);
    pass(callback, res, null);
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
    const res = await window.api.git.gitCommit(folderPath, message);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to commit to Git repo:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitDiscard({ folderPath, filePath }) {
  try {
    const res = await window.api.git.gitDiscard({ folderPath, filePath });
    return res?.ok
      ? { success: true, ...res.data }
      : { success: false, error: res?.error };
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to discard file changes:",
      err,
    ]);
    return { success: false, error: err.message };
  }
}

export async function handleGitFetch({
  folderPath,
  remote = "origin",
  opts,
  callback,
}) {
  try {
    const res = await window.api.git.gitFetch(folderPath, remote, opts);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] Failed to fetch:", err]);
    callback?.(null);
  }
}

export async function handleGitSetUpstream({
  folderPath,
  remote,
  branch,
  callback,
}) {
  try {
    const res = await window.api.git.gitSetUpstream(folderPath, remote, branch);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to set upstream:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitAddAll({ folderPath, callback }) {
  try {
    const res = await window.api.git.gitAddAll(folderPath);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] Failed to add all:", err]);
    callback?.(null);
  }
}

export async function handleGitAddPaths({ folderPath, paths, callback }) {
  try {
    const res = await window.api.git.gitAddPaths(folderPath, paths);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] Failed to add paths:", err]);
    callback?.(null);
  }
}

export async function handleGitResetPaths({ folderPath, paths, callback }) {
  try {
    const res = await window.api.git.gitResetPaths(folderPath, paths);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to reset paths:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitCommitPaths({
  folderPath,
  message,
  paths,
  callback,
}) {
  try {
    const res = await window.api.git.gitCommitPaths(folderPath, message, paths);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to commit paths:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitBranches({ folderPath, callback }) {
  try {
    const res = await window.api.git.gitBranches(folderPath);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to list branches:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitBranchCreate({
  folderPath,
  name,
  opts,
  callback,
}) {
  try {
    const res = await window.api.git.gitBranchCreate(folderPath, name, opts);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to create branch:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitCheckout({ folderPath, ref, callback }) {
  try {
    const res = await window.api.git.gitCheckout(folderPath, ref);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] Failed to checkout:", err]);
    callback?.(null);
  }
}

export async function handleGitBranchDelete({
  folderPath,
  name,
  force,
  callback,
}) {
  try {
    const res = await window.api.git.gitBranchDelete(folderPath, name, force);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to delete branch:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitDiffNameOnly({ folderPath, base, callback }) {
  try {
    const res = await window.api.git.gitDiffNameOnly(folderPath, base);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to diff name-only:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitDiffFile({ folderPath, file, base, callback }) {
  try {
    const res = await window.api.git.gitDiffFile(folderPath, file, base);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] Failed to diff file:", err]);
    callback?.(null);
  }
}

export async function handleGitLog({ folderPath, opts, callback }) {
  try {
    const res = await window.api.git.gitLog(folderPath, opts);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] Failed to get log:", err]);
    callback?.(null);
  }
}

export async function handleGitResetHard({ folderPath, ref, callback }) {
  try {
    const res = await window.api.git.gitResetHard(folderPath, ref);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] Failed to reset hard:", err]);
    callback?.(null);
  }
}

export async function handleGitRevert({ folderPath, hash, opts, callback }) {
  try {
    const res = await window.api.git.gitRevert(folderPath, hash, opts);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to revert commit:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitMerge({ folderPath, ref, callback }) {
  try {
    const res = await window.api.git.gitMerge(folderPath, ref);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] Failed to merge:", err]);
    callback?.(null);
  }
}

export async function handleGitContinueAny({ folderPath, callback }) {
  try {
    const res = await window.api.git.gitContinueAny(folderPath);
    callback?.(res?.ok ? res.data : null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] continue-any failed:", err]);
    callback?.(null);
  }
}

export async function handleGitMergeContinue({ folderPath, callback }) {
  try {
    const res = await window.api.git.gitMergeContinue(folderPath);
    callback?.(res?.ok ? res.data : null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] merge-continue failed:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitMergeAbort({ folderPath, callback }) {
  try {
    const res = await window.api.git.gitMergeAbort(folderPath);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to abort merge:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitRebaseStart({ folderPath, upstream, callback }) {
  try {
    const res = await window.api.git.gitRebaseStart(folderPath, upstream);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to start rebase:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitRebaseContinue({ folderPath, callback }) {
  try {
    const res = await window.api.git.gitRebaseContinue(folderPath);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to continue rebase:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitRebaseAbort({ folderPath, callback }) {
  try {
    const res = await window.api.git.gitRebaseAbort(folderPath);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to abort rebase:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitConflicts({ folderPath, callback }) {
  try {
    const res = await window.api.git.gitConflicts(folderPath);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to get conflicts:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitProgressState({ folderPath, callback }) {
  try {
    const res = await window.api.git.gitProgressState(folderPath);
    callback?.(res?.ok ? res.data : null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] progress-state failed:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitChooseOurs({ folderPath, file, callback }) {
  try {
    const res = await window.api.git.gitChooseOurs(folderPath, file);
    callback?.(res?.ok ? res.data : null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] choose-ours failed:", err]);
    callback?.(null);
  }
}

export async function handleGitChooseTheirs({ folderPath, file, callback }) {
  try {
    const res = await window.api.git.gitChooseTheirs(folderPath, file);
    callback?.(res?.ok ? res.data : null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] choose-theirs failed:", err]);
    callback?.(null);
  }
}

export async function handleGitMarkResolved({ folderPath, file, callback }) {
  try {
    const res = await window.api.git.gitMarkResolved(folderPath, file);
    callback?.(res?.ok ? res.data : null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] mark-resolved failed:", err]);
    callback?.(null);
  }
}

export async function handleGitRevertResolution({
  folderPath,
  file,
  callback,
}) {
  try {
    const res = await window.api.git.gitRevertResolution(folderPath, file);
    callback?.(res?.ok ? res.data : null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] revert-resolution failed:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitSync({ folderPath, remote = "origin", branch, callback }) {
  try {
    const res = await window.api.git.gitSync(folderPath, remote, branch);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", ["[GitHandler] Failed to sync:", err]);
    callback?.(null);
  }
}

export async function handleGitMergetool({ folderPath, file, callback }) {
  try {
    const res = await window.api.git.gitMergetool(folderPath, file);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to run mergetool:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGitOpenInVSCode({ folderPath, file, callback }) {
  try {
    const res = await window.api.git.gitOpenInVscode(folderPath, file);
    pass(callback, res, null);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[GitHandler] Failed to open in VSCode:",
      err,
    ]);
    callback?.(null);
  }
}
