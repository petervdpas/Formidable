// utils/gitUtils.js
import { EventBus } from "../modules/eventBus.js";
import { Toast } from "./toastUtils.js";
import { t } from "./i18n.js";

async function callWithResponse(channel, payload = {}) {
  const directReturnChannels = new Set(["git:discard"]);
  const positionalCallbackChannels = new Set(["config:load"]);

  if (
    directReturnChannels.has(channel) &&
    typeof EventBus.emitWithResponse === "function"
  ) {
    try {
      return await EventBus.emitWithResponse(channel, payload);
    } catch (e) {
      EventBus.emit("logging:error", [
        "[EventBus] emitWithResponse failed:",
        channel,
        e,
      ]);
      return null;
    }
  }

  if (positionalCallbackChannels.has(channel)) {
    return await new Promise((resolve) => {
      EventBus.emit(channel, resolve);
    });
  }

  return await new Promise((resolve) => {
    EventBus.emit(channel, { ...(payload || {}), callback: resolve });
  });
}

const CONFLICT_PAIRS = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);

export function normalizeFileStatus(file) {
  const index = String(file?.index ?? "").trim();
  const work = String(file?.working_dir ?? "").trim();

  const compact = `${index}${work}`.replace(/\s+/g, "");
  const symbol = compact || "??";

  const state = classifyStatus(index, work);

  return {
    index,
    work,
    symbol,
    state,
    className: state,
  };
}

export function classifyStatus(index, work) {
  if (index === "!" || work === "!") return "ignored";
  if (index === "?" || work === "?") return "untracked";
  if (index === "U" || work === "U" || CONFLICT_PAIRS.has(`${index}${work}`)) {
    return "conflicted";
  }
  if (index === "R" || work === "R") return "renamed";
  if (index === "A" || work === "A") return "added";
  if (index === "D" || work === "D") return "deleted";
  if (index === "M" || work === "M") return "modified";
  return "unknown";
}

export function mapStatusFiles(status) {
  return (
    status?.files?.map((f) => {
      const norm = normalizeFileStatus(f);
      return {
        display: f.path,
        value: f.path,
        index: f.index,
        working_dir: f.working_dir,
        symbol: norm.symbol,
        state: norm.state,
        className: norm.className,
      };
    }) || []
  );
}

// ── One-stop rules object ───────────────────────────────────────────────────
export const GitRules = Object.freeze({
  toNum(v) {
    return typeof v === "number" ? v : null;
  },

  isBusy(p) {
    return !!(
      p?.inMerge ||
      p?.inRebase ||
      (Array.isArray(p?.conflicted) && p.conflicted.length > 0)
    );
  },

  filesCount(status) {
    return Array.isArray(status?.files) ? status.files.length : 0;
  },

  deriveState(status, progress = null) {
    return {
      filesCount: this.filesCount(status),
      ahead: this.toNum(status?.ahead),
      behind: this.toNum(status?.behind),
      busy: this.isBusy(progress),
    };
  },

  canCommit(state, message) {
    return (
      !state.busy && state.filesCount > 0 && Boolean(message && message.trim())
    );
  },

  canPush(state, { strict = true } = {}) {
    if (state.busy) return false;
    if (strict && state.filesCount > 0) return false;
    return state.ahead !== null && state.ahead > 0;
  },

  canPull(state) {
    if (state.busy) return false;
    if (state.filesCount > 0) return false; // ⟵ pull blokkeren met unstaged changes
    if (state.ahead === null || state.behind === null) return true;
    if (state.ahead > 0) return false;
    return state.behind > 0;
  },

  canAutoStashPull(state) {
    return (
      !state.busy &&
      state.filesCount > 0 &&
      (state.behind ?? 0) > 0 &&
      (state.ahead ?? 0) === 0
    );
  },

  evaluate({ status, progress = null, message = "", strictPush = true } = {}) {
    const state = this.deriveState(status, progress);
    return {
      state,
      canCommit: this.canCommit(state, message),
      canPush: this.canPush(state, { strict: strictPush }),
      canPull: this.canPull(state),
      canAutoStashPull: this.canAutoStashPull(state),
    };
  },
});

function prettyGitError(err) {
  const msg = String(err?.message || err || "");
  if (/non-fast-forward/i.test(msg)) return t("git.error.nonFastForward");
  if (/no upstream|has no upstream/i.test(msg))
    return t("git.error.noUpstream");
  if (/would be overwritten by merge/i.test(msg))
    return t("git.error.wouldOverwriteMerge");
  if (/not a git repository/i.test(msg)) return t("git.error.notRepo");
  return t("git.error.unknown");
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

export async function getStatusFresh(folderPath) {
  return await callWithResponse("git:status-fresh", { folderPath });
}

export async function getRemoteInfo(folderPath) {
  return await callWithResponse("git:remote-info", { folderPath });
}

export async function pull(folderPath, opts = {}) {
  try {
    const res = await callWithResponse("git:pull", { folderPath, ...opts });
    EventBus.emit("git:ui:update", { scope: "git", action: "pull" });
    return res;
  } catch (err) {
    const msg = String(err?.message || err);
    if (/would be overwritten by merge/i.test(msg)) {
      Toast.warning("toast.git.pull.localChangesBlocked", [
        "Commit or stash your changes, then pull.",
      ]);
    } else {
      Toast.error("toast.git.pull.failed", [prettyGitError(err)]);
    }
    throw err;
  }
}

export async function push(folderPath, { notify = true } = {}) {
  try {
    const res = await callWithResponse("git:push", { folderPath });
    EventBus.emit("git:ui:update", { scope: "git", action: "push" });
    return res;
  } catch (err) {
    if (notify) Toast.error("toast.git.push.failed", [prettyGitError(err)]);
    throw err;
  }
}

export async function commit(folderPath, message, { notify = true } = {}) {
  try {
    const res = await callWithResponse("git:commit", { folderPath, message });
    EventBus.emit("git:ui:update", { scope: "git", action: "commit" });
    return res;
  } catch (err) {
    if (notify) Toast.error("toast.git.commit.failed", [prettyGitError(err)]);
    throw err;
  }
}

export async function discardFile(folderPath, filePath) {
  const res = await callWithResponse("git:discard", { folderPath, filePath });
  EventBus.emit("git:ui:update", { scope: "git", action: "discard" });
  return res;
}

export async function sync(
  folderPath,
  remote = "origin",
  branch,
  { notify = true } = {}
) {
  try {
    const res = await callWithResponse("git:sync", {
      folderPath,
      remote,
      branch,
    });
    EventBus.emit("git:ui:update", { scope: "git", action: "sync" });
    return res;
  } catch (err) {
    if (notify) Toast.error("toast.git.sync.failed", [prettyGitError(err)]);
    throw err;
  }
}

export async function continueAny(folderPath, message = null) {
  const res = await callWithResponse("git:continue-any", { folderPath, message });
  EventBus.emit("git:ui:update", { scope: "git", action: "progress" });
  return res;
}

/* ───────────────────── Conflicts / Merge / Rebase ───────────────────── */
export async function getConflicts(folderPath) {
  return await callWithResponse("git:conflicts", { folderPath });
}

export async function getProgressState(folderPath) {
  return await callWithResponse("git:progress-state", { folderPath });
}

export async function chooseOurs(folderPath, file) {
  return await callWithResponse("git:choose-ours", { folderPath, file });
}

export async function chooseTheirs(folderPath, file) {
  return await callWithResponse("git:choose-theirs", { folderPath, file });
}

export async function markResolved(folderPath, file) {
  // verwacht: backend doet `git add <file>` of `--theirs/--ours` staging
  const res = await callWithResponse("git:mark-resolved", { folderPath, file });
  EventBus.emit("git:ui:update", { scope: "git", action: "progress" });
  return res;
}

export async function revertResolution(folderPath, file) {
  return await callWithResponse("git:revert-resolution", { folderPath, file });
}

export async function mergeAbort(folderPath) {
  const res = await callWithResponse("git:merge-abort", { folderPath });
  EventBus.emit("git:ui:update", { scope: "git", action: "progress" });
  return res;
}

export async function mergeContinue(folderPath) {
  const res = await callWithResponse("git:merge-continue", { folderPath });
  EventBus.emit("git:ui:update", { scope: "git", action: "progress" });
  return res;
}

export async function rebaseStart(folderPath, upstream) {
  const res = await callWithResponse("git:rebase-start", {
    folderPath,
    upstream,
  });
  EventBus.emit("git:ui:update", { scope: "git", action: "progress" });
  return res;
}

export async function rebaseContinue(folderPath) {
  const res = await callWithResponse("git:rebase-continue", { folderPath });
  EventBus.emit("git:ui:update", { scope: "git", action: "progress" });
  return res;
}

export async function rebaseAbort(folderPath) {
  const res = await callWithResponse("git:rebase-abort", { folderPath });
  EventBus.emit("git:ui:update", { scope: "git", action: "progress" });
  return res;
}

export async function openMergetool(folderPath, file) {
  return await callWithResponse("git:mergetool", { folderPath, file });
}

export async function openInVSCode(folderPath, file) {
  return await callWithResponse("git:open-in-vscode", { folderPath, file });
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
 * Pull and detect conflicts. If conflicts are present, returns { ok:false, conflicts, state }.
 * Otherwise returns { ok:true, result }.
 */
export async function pullWithRebase(folderPath, remote, branch) {
  try {
    const res = await callWithResponse("git:pull", {
      folderPath,
      remote,
      branch,
      // If you later expose options in main, pass ['--rebase'] there.
    });

    const state = await getProgressState(folderPath);
    if (state?.conflicted?.length) {
      return { ok: false, conflicts: state.conflicted, state };
    }
    return { ok: true, result: res };
  } catch (err) {
    const state = await getProgressState(folderPath);
    if (state?.conflicted?.length) {
      return { ok: false, conflicts: state.conflicted, state };
    }
    throw err;
  }
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
      Toast.info("toast.git.autosync.disabled");
      return { skipped: "git_disabled" };
    }

    const rootPath = await getRoot(cfgPath);
    if (!rootPath) {
      console.log("[Git][AutoSync] skipped: not_a_repo", { cfgPath });
      Toast.info("toast.git.autosync.notRepo");
      return { skipped: "not_a_repo" };
    }

    console.log("[Git][AutoSync] using repo root", { rootPath });

    const status = await getStatus(rootPath);
    if (!status) {
      Toast.warning("toast.git.autosync.noStatus");
      return { skipped: "no_status" };
    }

    if (!hasTracking(status)) {
      Toast.info("toast.git.autosync.noTracking");
      return { skipped: "no_tracking" };
    }

    if (!isClean(status)) {
      Toast.info("toast.git.autosync.localChanges");
      return { skipped: "local_changes" };
    }

    if (isAhead(status)) {
      Toast.info("toast.git.autosync.ahead", [status.ahead]);
      return { skipped: "ahead" };
    }

    if (!isBehind(status)) {
      Toast.success("toast.git.autosync.upToDate");
      return { skipped: "uptodate" };
    }

    const result = await pull(rootPath);
    const summary = result?.summary;
    const changed =
      summary &&
      (summary.changes > 0 || summary.deletions > 0 || summary.insertions > 0);

    if (typeof result === "string") {
      Toast.success("toast.git.pull.complete");
    } else if (changed) {
      Toast.success("toast.git.pull.changes", [
        summary.changes,
        summary.deletions,
        summary.insertions,
      ]);
    } else {
      Toast.info("toast.git.pull.noChanges");
    }

    EventBus.emit("git:ui:update", { scope: "git", action: "pulled" });
    return { pulled: true, result };
  } catch (err) {
    const pretty = prettyGitError(err);
    Toast.error("toast.git.autosync.error", [pretty]);
    return { error: true, message: String(err?.message || err) };
  }
}
