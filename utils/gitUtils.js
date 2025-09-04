// utils/gitUtils.js
import { EventBus } from "../modules/eventBus.js";

/** Backward/forward-compatible helper for request/response style events. */
async function callWithResponse(channel, payload = {}) {
  // Handlers that RETURN a value (not via callback)
  const directReturnChannels = new Set([
    "git:discard", // handleGitDiscard returns a result
  ]);

  if (directReturnChannels.has(channel) && typeof EventBus.emitWithResponse === "function") {
    // Use the direct-return path for channels that support it
    try {
      return await EventBus.emitWithResponse(channel, payload);
    } catch (e) {
      EventBus.emit("logging:error", ["[EventBus] emitWithResponse failed:", channel, e]);
      return null;
    }
  }

  // Default path: handlers expect a callback in payload
  return await new Promise((resolve) => {
    EventBus.emit(channel, { ...(payload || {}), callback: resolve });
  });
}

/* ───────────────────── Config ───────────────────── */
export async function loadConfig() {
  const cfg = await callWithResponse("config:load");
  return cfg || {};
}
export function resolveGitPath(cfg) {
  return (cfg && (cfg.git_root || cfg.context_folder)) || ".";
}

/* ───────────────────── Git wrappers ───────────────────── */
export async function isGitRepo(folderPath) {
  return await callWithResponse("git:check", { folderPath });
}
export async function getRoot(folderPath) {
  return await callWithResponse("git:root", { folderPath });
}
export async function getStatus(folderPath) {
  return await callWithResponse("git:status", { folderPath });
}
export async function getRemoteInfo(folderPath) {
  return await callWithResponse("git:remote-info", { folderPath });
}
export async function pull(folderPath) {
  return await callWithResponse("git:pull", { folderPath });
}
export async function push(folderPath) {
  return await callWithResponse("git:push", { folderPath });
}
export async function commit(folderPath, message) {
  return await callWithResponse("git:commit", { folderPath, message });
}
export async function discardFile(folderPath, filePath) {
  // handler returns value directly (no callback)
  return await callWithResponse("git:discard", { folderPath, filePath });
}

/* ───────────────────── Helpers ───────────────────── */
export function isClean(status) {
  return Boolean(status?.clean) || (status?.files?.length ?? 0) === 0;
}
export function hasTracking(status) {
  return Boolean(status?.tracking);
}
export function isAhead(status) {
  return (status?.ahead || 0) > 0;
}
export function isBehind(status) {
  return (status?.behind || 0) > 0;
}

/**
 * Safe auto-sync policy:
 * - use_git must be true
 * - repo must exist
 * - tracking branch must be set
 * - working tree must be clean (no local changes)
 * - not ahead of remote
 * - if behind, do a pull and toast result
 */
export async function safeAutoSyncOnReload(cfg) {
  const cfgPath = resolveGitPath(cfg);
  console.log("[Git][AutoSync] start", { use_git: cfg?.use_git, cfgPath });

  try {
    if (!cfg?.use_git) {
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.autosync.disabled",
        message: "Git auto-sync is disabled in this profile.",
        variant: "info",
      });
      return { skipped: "git_disabled" };
    }

    // 🔧 Always resolve to the actual repo root first
    const rootPath = await getRoot(cfgPath);
    if (!rootPath) {
      console.log("[Git][AutoSync] skipped: not_a_repo", { cfgPath });
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.autosync.notRepo",
        message: "No Git repository found at the configured path.",
        variant: "info",
      });
      return { skipped: "not_a_repo" };
    }

    console.log("[Git][AutoSync] using repo root", { rootPath });

    const status = await getStatus(rootPath);
    if (!status) {
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.autosync.noStatus",
        message: "Could not read Git status.",
        variant: "warning",
      });
      return { skipped: "no_status" };
    }

    if (!hasTracking(status)) {
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.autosync.noTracking",
        message: "No tracking branch set — auto-sync skipped.",
        variant: "info",
      });
      return { skipped: "no_tracking" };
    }

    if (!isClean(status)) {
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.autosync.localChanges",
        message: "Local changes detected — auto-sync skipped.",
        variant: "info",
      });
      return { skipped: "local_changes" };
    }

    if (isAhead(status)) {
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.autosync.ahead",
        message: `Your branch is ahead by ${status.ahead} commit(s) — auto-sync skipped.`,
        args: [status.ahead],
        variant: "info",
      });
      return { skipped: "ahead" };
    }

    if (!isBehind(status)) {
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.autosync.upToDate",
        message: "Repository is up to date.",
        variant: "success",
      });
      return { skipped: "uptodate" };
    }

    // Behind → pull from the root
    const result = await pull(rootPath);
    const summary = result?.summary;
    const changed =
      summary && (summary.changes > 0 || summary.deletions > 0 || summary.insertions > 0);

    if (typeof result === "string") {
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.pull.complete",
        message: "Pull complete.",
        variant: "success",
      });
    } else if (changed) {
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.pull.changes",
        message: `Pulled: ${summary.changes} changes, ${summary.deletions} deletions, ${summary.insertions} insertions.`,
        args: [summary.changes, summary.deletions, summary.insertions],
        variant: "success",
      });
    } else {
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.pull.noChanges",
        message: "Nothing new to pull.",
        variant: "info",
      });
    }

    EventBus.emit("status:update", { scope: "git", action: "pulled" });
    return { pulled: true, result };
  } catch (err) {
    EventBus.emit("ui:toast", {
      languageKey: "toast.git.autosync.error",
      message: `Auto-sync failed: ${String(err?.message || err)}`,
      args: [String(err?.message || err)],
      variant: "error",
    });
    return { error: true, message: String(err?.message || err) };
  }
}
