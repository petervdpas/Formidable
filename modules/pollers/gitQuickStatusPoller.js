// modules/pollers/gitQuickStatusPoller.js
import { EventBus } from "../eventBus.js";
import { t } from "../../utils/i18n.js";
import {
  loadConfig,
  resolveGitPath,
  getProgressState,
  getStatus,
} from "../../utils/gitUtils.js";

const safe = (s) => String(s || "").replace(/[^a-z0-9:_-]/gi, "_");

function applyStateToButton(btnSelector, progress = {}, status = null) {
  const el = document.querySelector(btnSelector);
  if (!el) return;

  // remember the default title ONCE
  if (!el.hasAttribute("data-default-title")) {
    el.setAttribute("data-default-title", el.title || "Git quick actions");
  }
  const defaultTitle =
    el.getAttribute("data-default-title") || "Git quick actions";

  // progress bits
  const hasConflicts = (progress.conflicted || []).length > 0;
  const inMerge = !!progress.inMerge;
  const inRebase = !!progress.inRebase;

  // status bits (working tree changes)
  const filesCount = Array.isArray(status?.files) ? status.files.length : 0;
  const commitPossible =
    !hasConflicts && !inMerge && !inRebase && filesCount > 0;

  // clear & set only the winning state (priority)
  el.classList.toggle("has-conflicts", false);
  el.classList.toggle("in-merge", false);
  el.classList.toggle("in-rebase", false);
  el.classList.toggle("commit-possible", false);

  el.classList.toggle("is-danger", false);
  el.classList.toggle("is-warning", false);
  el.classList.toggle("is-success", false);
  el.classList.toggle("is-info", false);

  let title = defaultTitle;
  const prefix = t("standard.git", "Git");

  if (hasConflicts) {
    el.classList.add("has-conflicts", "is-danger");

    // localized labels
    const mergeTxt = t("git.quick.state.merge", "merge");
    const rebaseTxt = t("git.quick.state.rebase", "rebase");

    // plural-aware conflicts (fallback still reads well)
    const n = (progress.conflicted || []).length;
    const conflictsTxt =
      n === 1
        ? t("git.quick.state.conflict", ["1"], "1 conflict")
        : t("git.quick.state.conflicts", [n], `${n} conflicts`);

    const parts = [];
    if (inMerge) parts.push(mergeTxt);
    if (inRebase) parts.push(rebaseTxt);

    title = `${prefix}: ${conflictsTxt}${
      parts.length ? " · " + parts.join(" · ") : ""
    }`;
  } else if (inMerge || inRebase) {
    el.classList.add("is-warning");
    if (inMerge) el.classList.add("in-merge");
    if (inRebase) el.classList.add("in-rebase");

    const parts = [];
    if (inMerge) parts.push(t("git.quick.state.merge", "merge"));
    if (inRebase) parts.push(t("git.quick.state.rebase", "rebase"));
    title = `${prefix}: ${parts.join(" · ")}`;
  } else if (commitPossible) {
    el.classList.add("commit-possible", "is-info");
    const tail = t(
      "git.quick.changes.to.commit",
      [filesCount],
      `changes to commit (${filesCount})`
    );
    title = `${prefix}: ${tail}`;
  }

  el.title = title;
  el.setAttribute("aria-label", title);
}

export async function startGitQuickStatusPoller(
  buttonId = "status-gitquick-btn"
) {
  const cfg = await loadConfig();
  const gitPath = resolveGitPath(cfg);
  if (!gitPath) return;

  const btnSelector = `#${buttonId}`;
  const POLLER_ID = `git:statusbtn:${safe(gitPath)}`;

  // initial paint
  try {
    const [progress, status] = await Promise.all([
      getProgressState(gitPath),
      getStatus(gitPath),
    ]);
    applyStateToButton(btnSelector, progress || {}, status || null);
  } catch {
    applyStateToButton(btnSelector, {}, null);
  }

  // idempotent register
  EventBus.emit("tasks:unregister", POLLER_ID);
  EventBus.emit("tasks:register", {
    id: POLLER_ID,
    interval: 30_000,
    intervalHidden: 120_000,
    jitterPct: 0.2,
    immediate: true,
    pauseWhenHidden: true,
    condition: { type: "dom-exists", selector: btnSelector },
    args: { gitPath, sig: "" },
    backoff: { strategy: "exponential", factor: 2, max: 300_000 },
    fn: async (args, ctx) => {
      const [progress, status] = await Promise.all([
        getProgressState(args.gitPath).catch(() => null),
        getStatus(args.gitPath).catch(() => null),
      ]);

      const hasConflicts = (progress?.conflicted || []).length > 0;
      const inMerge = !!progress?.inMerge;
      const inRebase = !!progress?.inRebase;
      const filesCount = Array.isArray(status?.files) ? status.files.length : 0;
      const commitPossible =
        !hasConflicts && !inMerge && !inRebase && filesCount > 0;

      // signature so we only repaint when something actually changed
      const sig = [
        +hasConflicts,
        +inMerge,
        +inRebase,
        +commitPossible,
        filesCount,
        (progress?.conflicted || []).join("|"),
      ].join(":");

      if (sig !== args.sig) {
        args.sig = sig;
        ctx.update({ args });
        applyStateToButton(btnSelector, progress || {}, status || null);
      }
    },
  });

  // fast refresh on other git events
  const off = EventBus.on("status:update", (e) => {
    if (e?.scope === "git") EventBus.emit("tasks:runNow", POLLER_ID);
  });

  // cleanup if button removed
  const mo = new MutationObserver(() => {
    if (!document.querySelector(btnSelector)) {
      EventBus.emit("tasks:unregister", POLLER_ID);
      off?.();
      mo.disconnect();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
