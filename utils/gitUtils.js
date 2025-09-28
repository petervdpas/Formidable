// utils/gitUtils.js
import { EventBus } from "../modules/eventBus.js";
import { Toast } from "./toastUtils.js";

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
  const index = String(file?.index || "").trim();
  const work = String(file?.working_dir || "").trim();

  const pair = `${index}${work}` || "??";
  const symbol = pair === "  " ? "" : pair.replace(/\s+/g, "") || "??";

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
  toNum(v) { return (typeof v === "number" ? v : null); },

  isBusy(p) {
    return !!(p?.inMerge || p?.inRebase ||
      (Array.isArray(p?.conflicted) && p.conflicted.length > 0));
  },

  filesCount(status) { return Array.isArray(status?.files) ? status.files.length : 0; },

  deriveState(status, progress = null) {
    return {
      filesCount: this.filesCount(status),
      ahead: this.toNum(status?.ahead),
      behind: this.toNum(status?.behind),
      busy: this.isBusy(progress),
    };
  },

  // legacy-style (list/message) – still available if you need it
  canCommitLegacy({ listLen, message }) {
    return listLen > 0 && Boolean(message && message.trim());
  },
  canPushLegacy({ status }) {
    const a = this.toNum(status?.ahead);
    return a !== null && a > 0;
  },
  canPullLegacy({ status }) {
    const a = this.toNum(status?.ahead);
    const b = this.toNum(status?.behind);
    if (a === null || b === null) return true;
    if (a > 0) return false;
    return b > 0;
  },

  // state-based (preferred)
  canCommit(state, message) {
    return !state.busy && state.filesCount > 0 && Boolean(message && message.trim());
  },
  canPush(state, { strict = true } = {}) {
    if (state.busy) return false;
    if (strict && state.filesCount > 0) return false; // “no push before commit”
    return state.ahead !== null && state.ahead > 0;
  },
  canPull(state) {
    if (state.busy) return false;
    if (state.ahead === null || state.behind === null) return true;
    if (state.ahead > 0) return false;
    return state.behind > 0;
  },

  /** Convenience: compute everything at once */
  evaluate({ status, progress = null, message = "", strictPush = true } = {}) {
    const state = this.deriveState(status, progress);
    return {
      state,
      canCommit: this.canCommit(state, message),
      canPush:   this.canPush(state, { strict: strictPush }),
      canPull:   this.canPull(state),
    };
  },
});

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
  // returns directly
  return await callWithResponse("git:discard", { folderPath, filePath });
}

/* ───────────────────── Conflicts / Merge / Rebase ───────────────────── */
export async function getConflicts(folderPath) {
  // returns array of conflicted file paths
  return await callWithResponse("git:conflicts", { folderPath });
}

export async function getProgressState(folderPath) {
  // { inMerge:boolean, inRebase:boolean, conflicted:string[] }
  return await callWithResponse("git:progress-state", { folderPath });
}

export async function chooseOurs(folderPath, file) {
  return await callWithResponse("git:choose-ours", { folderPath, file });
}

export async function chooseTheirs(folderPath, file) {
  return await callWithResponse("git:choose-theirs", { folderPath, file });
}

export async function markResolved(folderPath, file) {
  return await callWithResponse("git:mark-resolved", { folderPath, file });
}

export async function revertResolution(folderPath, file) {
  return await callWithResponse("git:revert-resolution", { folderPath, file });
}

export async function mergeAbort(folderPath) {
  return await callWithResponse("git:merge-abort", { folderPath });
}

export async function mergeContinue(folderPath) {
  return await callWithResponse("git:merge-continue", { folderPath });
}

export async function rebaseStart(folderPath, upstream) {
  return await callWithResponse("git:rebase-start", { folderPath, upstream });
}

export async function rebaseContinue(folderPath) {
  return await callWithResponse("git:rebase-continue", { folderPath });
}

export async function rebaseAbort(folderPath) {
  return await callWithResponse("git:rebase-abort", { folderPath });
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

    // 🔧 Always resolve to the actual repo root first
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

    // Behind → pull from the root
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

    EventBus.emit("status:update", { scope: "git", action: "pulled" });
    return { pulled: true, result };
  } catch (err) {
    Toast.error("toast.git.autosync.error", [String(err?.message || err)]);
    return { error: true, message: String(err?.message || err) };
  }
}
