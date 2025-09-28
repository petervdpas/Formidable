// modules/pollers/gitQuickStatusPoller.js
import { EventBus } from "../eventBus.js";
import { t } from "../../utils/i18n.js";
import {
  loadConfig,
  resolveGitPath,
  getProgressState,
  getStatus,
  GitRules,
} from "../../utils/gitUtils.js";

const safe = (s) => String(s || "").replace(/[^a-z0-9:_-]/gi, "_");

function applyStateToButton(btnSelector, progress = {}, status = null) {
  const el = document.querySelector(btnSelector);
  if (!el) return;

  if (!el.hasAttribute("data-default-title")) {
    el.setAttribute("data-default-title", el.title || "Git quick actions");
  }
  const defaultTitle =
    el.getAttribute("data-default-title") || "Git quick actions";

  const state = GitRules.deriveState(status || {}, progress || {});
  const hasConflicts = (progress?.conflicted || []).length > 0;
  const inMerge = !!progress?.inMerge;
  const inRebase = !!progress?.inRebase;
  const commitPossible = !state.busy && state.filesCount > 0;
  const pushPossible = GitRules.canPush(state, { strict: true });
  const ahead = state.ahead ?? 0;

  el.classList.toggle("has-conflicts", false);
  el.classList.toggle("in-merge", false);
  el.classList.toggle("in-rebase", false);
  el.classList.toggle("commit-possible", false);
  el.classList.toggle("push-possible", false);

  el.classList.toggle("is-danger", false);
  el.classList.toggle("is-warning", false);
  el.classList.toggle("is-success", false);
  el.classList.toggle("is-info", false);

  let title = defaultTitle;
  const prefix = t("standard.git", "Git");

  if (hasConflicts) {
    el.classList.add("has-conflicts", "is-danger");

    const mergeTxt = t("git.quick.state.merge", "merge");
    const rebaseTxt = t("git.quick.state.rebase", "rebase");

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
      [state.filesCount],
      `changes to commit (${state.filesCount})`
    );
    title = `${prefix}: ${tail}`;
  } else if (pushPossible) {
    el.classList.add("push-possible", "is-success");
    const tail = t(
      "git.quick.ready.to.push",
      [ahead],
      `ready to push (${ahead})`
    );
    title = `${prefix}: ${tail}`;
  } else {
    // nothing special — leave default title/styles
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

  try {
    const [progress, status] = await Promise.all([
      getProgressState(gitPath),
      getStatus(gitPath),
    ]);
    applyStateToButton(btnSelector, progress || {}, status || null);
  } catch {
    applyStateToButton(btnSelector, {}, null);
  }

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

      const state = GitRules.deriveState(status || {}, progress || {});
      const hasConflicts = (progress?.conflicted || []).length > 0;
      const inMerge = !!progress?.inMerge;
      const inRebase = !!progress?.inRebase;
      const commitPossible = !state.busy && state.filesCount > 0;
      const pushPossible = GitRules.canPush(state, { strict: true });
      const ahead = state.ahead ?? -1;

      const sig = [
        +hasConflicts,
        +inMerge,
        +inRebase,
        +commitPossible,
        +pushPossible,
        state.filesCount,
        ahead,
        (progress?.conflicted || []).join("|"),
      ].join(":");

      if (sig !== args.sig) {
        args.sig = sig;
        ctx.update({ args });
        applyStateToButton(btnSelector, progress || {}, status || null);
      }
    },
  });

  let runNowTimer = null;
  const noisy = new Set(["progress", "status"]);
  const off = EventBus.on("status:update", (e) => {
    if (e?.scope !== "git") return;
    if (noisy.has(e?.action)) return;
    clearTimeout(runNowTimer);
    runNowTimer = setTimeout(() => {
      EventBus.emit("tasks:runNow", POLLER_ID);
    }, 250);
  });

  const mo = new MutationObserver(() => {
    if (!document.querySelector(btnSelector)) {
      EventBus.emit("tasks:unregister", POLLER_ID);
      off?.();
      mo.disconnect();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
