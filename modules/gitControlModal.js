// modules/gitControlModal.js
import { EventBus } from "./eventBus.js";
import { buildButtonGroup } from "../utils/buttonUtils.js";
import {
  createGitCommitButton,
  createGitDiscardButton,
  createGitFetchButton,
  createGitCheckoutButton,
  createGitCreateCheckoutButton,
  createGitPullButton,
  createGitPushButton,
} from "./uiButtons.js";
import {
  addContainerElement,
  buildLabeledControl,
} from "../utils/elementBuilders.js";
import { createListManager } from "../utils/listUtils.js";
import { showConfirmModal } from "../utils/modalUtils.js";
import { createDropdown } from "../utils/dropdownUtils.js";
import { t, translateDOM } from "../utils/i18n.js";
import { Toast } from "../utils/toastUtils.js";
import {
  loadConfig,
  resolveGitPath,
  getStatus,
  getRemoteInfo,
  commit as gitCommit,
  pull as gitPull,
  push as gitPush,
  discardFile as gitDiscard,
  mapStatusFiles,
  normalizeFileStatus,
  getProgressState,
  chooseOurs,
  chooseTheirs,
  mergeContinue,
  mergeAbort,
  rebaseContinue,
  rebaseAbort,
  openMergetool,
  GitRules,
} from "../utils/gitUtils.js";

const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

/* -------------------------------- shared --------------------------------- */
export async function getGitContext() {
  const cfg = await loadConfig();
  const gitPath = resolveGitPath(cfg);
  const [status, remoteInfo] = await Promise.all([
    getStatus(gitPath),
    getRemoteInfo(gitPath),
  ]);
  return { gitPath, status, remoteInfo };
}

function makeGitBadge({ parent, key, count, marginLeft = "" }) {
  return addContainerElement({
    parent,
    tag: "span",
    className: "git-badge",
    attributes: marginLeft ? { style: `margin-left:${marginLeft}` } : {},
    i18nKey: key,
    i18nArgs: [Number(count || 0)],
  });
}

/* -------------------------------- left pane ------------------------------- */
export async function buildGitControlLeftPane({ gitPath, status, remoteInfo }) {
  const node = document.createElement("div");

  /* ───── Branch / remote block ───── */
  const section = addContainerElement({
    parent: node,
    className: "git-section",
  });
  addContainerElement({
    parent: section,
    tag: "h3",
    i18nKey: "git.branches",
    attributes: { style: "margin-top:0" },
  });

  const remotes = remoteInfo?.remotes?.map((r) => r.name) || [];
  let selectedRemote = remotes.includes("origin") ? "origin" : remotes[0] || "";
  let selectedRemoteBranch = "";

  const fetchBtn = createGitFetchButton(async () => {
    try {
      fetchBtn.disabled = true;
      await EventBus.emitWithResponse("git:fetch", {
        folderPath: gitPath,
        remote: selectedRemote,
        opts: ["--prune"],
      });
      Toast.success("toast.git.fetch.complete");
      await refreshRemoteBranches();
    } finally {
      fetchBtn.disabled = false;
    }
  });

  const checkoutBtn = createGitCheckoutButton(async () => {
    if (!selectedRemote || !selectedRemoteBranch) return;
    await EventBus.emitWithResponse("git:branch-create", {
      folderPath: gitPath,
      name: selectedRemoteBranch,
      opts: { checkout: true },
    });
    await EventBus.emitWithResponse("git:set-upstream", {
      folderPath: gitPath,
      remote: selectedRemote,
      branch: selectedRemoteBranch,
    });
    Toast.success("toast.git.checkout.complete");
  });

  let remoteBranchDDWrap = null;
  let rebuildRemoteBranches = () => {};
  async function refreshRemoteBranches() {
    const latest = await getRemoteInfo(gitPath);
    remoteInfo = latest || remoteInfo;
    rebuildRemoteBranches();
  }

  section.appendChild(
    buildLabeledControl({
      labelTextOrKey: "git.remote",
      i18nEnabled: true,
      layout: "two-column",
      labelWidth: "120px",
      control: (mount) => {
        createDropdown({
          containerEl: mount,
          labelTextOrKey: "",
          options: remotes.map((n) => ({ value: n, label: n })),
          selectedValue: selectedRemote,
          onChange: (v) => {
            selectedRemote = v;
            rebuildRemoteBranches();
          },
        });
      },
      actions: [fetchBtn],
    })
  );

  section.appendChild(
    buildLabeledControl({
      labelTextOrKey: "git.branches",
      i18nEnabled: true,
      layout: "two-column",
      labelWidth: "120px",
      control: (mount) => {
        remoteBranchDDWrap = mount;
        rebuildRemoteBranches = () => {
          remoteBranchDDWrap.innerHTML = "";
          const branches = (remoteInfo?.remoteBranches || [])
            .filter((b) => selectedRemote && b.startsWith(`${selectedRemote}/`))
            .map((b) => b.replace(`${selectedRemote}/`, ""));
          selectedRemoteBranch = branches[0] || "";
          createDropdown({
            containerEl: remoteBranchDDWrap,
            labelTextOrKey: "",
            options: branches.map((n) => ({ value: n, label: n })),
            selectedValue: selectedRemoteBranch,
            onChange: (v) => (selectedRemoteBranch = v),
          });
        };
        rebuildRemoteBranches();
      },
      actions: [checkoutBtn],
    })
  );

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = "git-new-branch";
  nameInput.setAttribute("data-i18n-placeholder", "git.branch.new.placeholder");

  const createBtn = createGitCreateCheckoutButton(async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    await EventBus.emitWithResponse("git:branch-create", {
      folderPath: gitPath,
      name,
      opts: { checkout: true },
    });
    if (selectedRemote) {
      await EventBus.emitWithResponse("git:set-upstream", {
        folderPath: gitPath,
        remote: selectedRemote,
        branch: name,
      });
    }
    Toast.success("toast.git.branch.created");
    nameInput.value = "";
  });

  section.appendChild(
    buildLabeledControl({
      labelTextOrKey: "git.branch.new",
      i18nEnabled: true,
      forId: nameInput.id,
      layout: "two-column",
      labelWidth: "120px",
      control: nameInput,
      actions: [createBtn],
    })
  );

  const trackingRow = addContainerElement({
    parent: section,
    attributes: { style: "font-size:12px;opacity:.9;margin-top:8px" },
  });

  const renderTrackingRow = () => {
    trackingRow.innerHTML = "";
    const line1 = addContainerElement({ parent: trackingRow });
    addContainerElement({ parent: line1, tag: "span", i18nKey: "git.branch" });
    addContainerElement({ parent: line1, tag: "span", textContent: ": " });
    addContainerElement({
      parent: line1,
      tag: "b",
      textContent: status.current || "",
    });

    const badges = addContainerElement({ parent: trackingRow });
    makeGitBadge({
      parent: badges,
      key: "git.badge.ahead",
      count: status.ahead,
    });
    makeGitBadge({
      parent: badges,
      key: "git.badge.behind",
      count: status.behind,
      marginLeft: "6px",
    });

    const line2 = addContainerElement({ parent: trackingRow });
    addContainerElement({
      parent: line2,
      tag: "span",
      i18nKey: "git.tracked",
    });
    addContainerElement({ parent: line2, tag: "span", textContent: ": " });
    if (status.tracking) {
      addContainerElement({
        parent: line2,
        tag: "span",
        textContent: status.tracking,
      });
    } else {
      addContainerElement({
        parent: line2,
        tag: "span",
        i18nKey: "standard.none",
      });
    }
  };
  renderTrackingRow();

  /* ───── Conflicts ───── */
  const conflictSection = addContainerElement({
    parent: node,
    className: "git-section",
  });

  addContainerElement({
    parent: conflictSection,
    tag: "h3",
    i18nKey: "git.conflicts.header",
    attributes: { style: "margin-top:0" },
  });

  const topBar = addContainerElement({
    parent: conflictSection,
    className: "git-actions-top",
    attributes: {
      style: "display:flex;gap:6px;align-items:center;margin-bottom:8px",
    },
  });

  const listWrap = addContainerElement({
    parent: conflictSection,
    className: "git-conflict-list",
  });

  let currentProgress = { inMerge: false, inRebase: false, conflicted: [] };

  function setBusy(container, busy) {
    container
      .querySelectorAll("button")
      .forEach((b) => (b.disabled = !!busy || b._disabledByRule === true));
  }

  function primaryActions() {
    topBar.innerHTML = "";
    const s = currentProgress;

    if (s.inMerge) {
      const cont = document.createElement("button");
      cont.className = "btn btn--primary";
      cont.textContent = t("git.merge.continue") || "Merge Continue";
      cont.addEventListener("click", async () => {
        try {
          setBusy(conflictSection, true);
          const res = await mergeContinue(gitPath);
          if (res?.ok === false)
            Toast.error(String(res?.error || "merge --continue failed"));
          else Toast.success("Merge continued");
        } finally {
          await refreshProgress();
          setBusy(conflictSection, false);
        }
      });

      const abort = document.createElement("button");
      abort.className = "btn btn--quiet";
      abort.textContent = t("git.merge.abort") || "Merge Abort";
      abort.addEventListener("click", async () => {
        try {
          setBusy(conflictSection, true);
          const res = await mergeAbort(gitPath);
          if (res?.ok === false)
            Toast.error(String(res?.error || "merge --abort failed"));
          else Toast.success("Merge aborted");
        } finally {
          await refreshProgress();
          setBusy(conflictSection, false);
        }
      });

      topBar.append(cont, abort);
    } else if (s.inRebase) {
      const cont = document.createElement("button");
      cont.className = "btn btn--primary";
      cont.textContent = t("git.rebase.continue") || "Rebase Continue";
      cont.addEventListener("click", async () => {
        try {
          setBusy(conflictSection, true);
          const res = await rebaseContinue(gitPath);
          if (res?.ok === false)
            Toast.error(String(res?.error || "rebase --continue failed"));
          else Toast.success("Rebase continued");
        } finally {
          await refreshProgress();
          setBusy(conflictSection, false);
        }
      });

      const abort = document.createElement("button");
      abort.className = "btn btn--quiet";
      abort.textContent = t("git.rebase.abort") || "Rebase Abort";
      abort.addEventListener("click", async () => {
        try {
          setBusy(conflictSection, true);
          const res = await rebaseAbort(gitPath);
          if (res?.ok === false)
            Toast.error(String(res?.error || "rebase --abort failed"));
          else Toast.success("Rebase aborted");
        } finally {
          await refreshProgress();
          setBusy(conflictSection, false);
        }
      });

      topBar.append(cont, abort);
    }

    // Bulk actions only if >1 conflicts
    if ((s.conflicted?.length || 0) > 1) {
      const spacer = document.createElement("div");
      spacer.style.flex = "1";
      topBar.appendChild(spacer);

      const allOurs = document.createElement("button");
      allOurs.className = "btn btn--small";
      allOurs.textContent = t("git.pick.ours.all") || "Resolve all as Ours";
      allOurs.addEventListener("click", async () => {
        try {
          setBusy(conflictSection, true);
          for (const f of s.conflicted) {
            await chooseOurs(gitPath, f);
          }
          Toast.success("Resolved all as ours");
        } finally {
          await refreshProgress();
          setBusy(conflictSection, false);
        }
      });

      const allTheirs = document.createElement("button");
      allTheirs.className = "btn btn--small";
      allTheirs.textContent =
        t("git.pick.theirs.all") || "Resolve all as Theirs";
      allTheirs.addEventListener("click", async () => {
        try {
          setBusy(conflictSection, true);
          for (const f of s.conflicted) {
            await chooseTheirs(gitPath, f);
          }
          Toast.success("Resolved all as theirs");
        } finally {
          await refreshProgress();
          setBusy(conflictSection, false);
        }
      });

      topBar.append(allOurs, allTheirs);
    }
  }

  function renderConflictList() {
    listWrap.innerHTML = "";
    const files = currentProgress.conflicted || [];
    if (!files.length) {
      addContainerElement({
        parent: listWrap,
        tag: "div",
        className: "muted",
        i18nKey: "git.conflicts.none",
      });
      return;
    }

    files.forEach((file) => {
      const row = addContainerElement({
        parent: listWrap,
        className: "git-conflict-item",
        attributes: {
          style: "display:flex;gap:6px;align-items:center",
        },
      });

      addContainerElement({
        parent: row,
        tag: "code",
        textContent: file,
        attributes: {
          style:
            "flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
        },
      });

      const btnOurs = document.createElement("button");
      btnOurs.className = "btn btn--small";
      btnOurs.textContent = t("git.pick.ours") || "Ours";
      btnOurs.addEventListener("click", async () => {
        try {
          setBusy(row, true);
          const res = await chooseOurs(gitPath, file);
          if (res?.ok === false)
            Toast.error(String(res?.error || "choose ours failed"));
          else Toast.success("Picked ours");
        } finally {
          await refreshProgress();
          setBusy(row, false);
        }
      });

      const btnTheirs = document.createElement("button");
      btnTheirs.className = "btn btn--small";
      btnTheirs.textContent = t("git.pick.theirs") || "Theirs";
      btnTheirs.addEventListener("click", async () => {
        try {
          setBusy(row, true);
          const res = await chooseTheirs(gitPath, file);
          if (res?.ok === false)
            Toast.error(String(res?.error || "choose theirs failed"));
          else Toast.success("Picked theirs");
        } finally {
          await refreshProgress();
          setBusy(row, false);
        }
      });

      const btnTool = document.createElement("button");
      btnTool.className = "btn btn--small";
      btnTool.textContent = t("git.mergetool.open") || "Mergetool";
      btnTool.addEventListener("click", async () => {
        try {
          setBusy(row, true);
          const res = await openMergetool(gitPath, file);
        } finally {
          // We don't force-refresh here; mergetool is external.
          setBusy(row, false);
          Toast.info("Mergetool launched");
        }
      });

      row.append(btnOurs, btnTheirs, btnTool);
    });
  }

  async function refreshProgress() {
    const progress = await getProgressState(gitPath);
    currentProgress = progress || {
      inMerge: false,
      inRebase: false,
      conflicted: [],
    };
    primaryActions();
    renderConflictList();
    translateDOM(node);
    EventBus.emit("status:update", { scope: "git-ui", action: "progress" });
  }

  const off = EventBus.on("status:update", (e) => {
    if (e?.scope !== "git") return;
    // ignore UI-driven refresh pings
    if (e?.action === "progress" || e?.action === "status") return;
    refreshProgress();
  });

  // initial paint of progress
  await refreshProgress();

  return {
    node,
    init: async () => requestAnimationFrame(() => translateDOM(node)),
    destroy: () => off?.(),
  };
}

/* -------------------------------- right pane ------------------------------ */
export async function buildGitControlRightPane({ gitPath, status, modalApi }) {
  const node = document.createElement("div");

  const section = addContainerElement({
    parent: node,
    className: "git-section",
  });
  addContainerElement({
    parent: section,
    tag: "h3",
    i18nKey: "git.status",
    attributes: { style: "margin-top:0" },
  });

  const fileListId = uid("git-file-list");
  addContainerElement({
    parent: section,
    className: "git-file-list",
    attributes: { id: fileListId },
  });

  // unified state for rules
  let currentStatus = status;
  let currentProgress = await getProgressState(gitPath);
  let commitMessage = "";

  const msgInput = document.createElement("textarea");
  msgInput.id = "git-commit-message";
  msgInput.placeholder = t("git.commit.placeholder");

  const commitBtn = createGitCommitButton(async () => {
    const { canCommit } = GitRules.evaluate({
      status: currentStatus,
      progress: currentProgress,
      message: commitMessage,
    });
    if (!canCommit) {
      Toast.warning("toast.git.commit.noMessage");
      return;
    }
    commitBtn.disabled = true;
    try {
      const res = await gitCommit(gitPath, commitMessage);
      if (typeof res === "string") {
        Toast.success("toast.git.commit.complete");
      } else if (res?.summary?.changes != null) {
        Toast.success("toast.git.commit.success", [res.summary.changes]);
      } else {
        Toast.success("toast.git.commit.complete");
      }
      msgInput.value = "";
      commitMessage = "";
      await refreshStatusProgressAndList();
    } finally {
      recomputeButtons();
      msgInput.focus();
    }
  }, false);

  const pullBtn = createGitPullButton(async () => {
    pullBtn.disabled = true;
    try {
      const result = await gitPull(gitPath);
      const sum = result?.summary;
      const changed =
        sum && (sum.changes > 0 || sum.deletions > 0 || sum.insertions > 0);
      if (typeof result === "string") {
        Toast.success("toast.git.pull.complete");
      } else if (changed) {
        Toast.success("toast.git.pull.changes", [
          sum.changes,
          sum.deletions,
          sum.insertions,
        ]);
      } else {
        Toast.info("toast.git.pull.noChanges");
      }
      await refreshStatusProgressAndList();
    } finally {
      recomputeButtons();
    }
  }, false);

  const pushBtn = createGitPushButton(async () => {
    pushBtn.disabled = true;
    try {
      const result = await gitPush(gitPath);
      const hash = result?.update?.hash;
      const head = result?.update?.head;
      if (hash?.from && hash?.to) {
        const branch = head?.local?.replace("refs/heads/", "") || "unknown";
        const fromShort = String(hash.from).slice(0, 7);
        const toShort = String(hash.to).slice(0, 7);
        Toast.success("toast.git.push.range", [branch, fromShort, toShort]);
      } else {
        Toast.success("toast.git.push.complete");
      }
      await refreshStatusProgressAndList();
    } finally {
      recomputeButtons();
    }
  }, false);

  const commitInputRow = buildLabeledControl({
    labelTextOrKey: "git.commit.message",
    i18nEnabled: true,
    forId: msgInput.id,
    layout: "stacked",
    labelWidth: "140px",
    control: msgInput,
  });
  commitInputRow.classList.add("git-commit-input-row");
  section.appendChild(commitInputRow);

  const commitRow = addContainerElement({
    parent: section,
    className: "git-commit-row",
    attributes: { style: "margin-top:8px" },
  });
  commitRow.appendChild(commitBtn);

  const syncRow = addContainerElement({
    parent: section,
    className: "git-row",
    attributes: { style: "margin-top:8px" },
  });
  const syncGroup = buildButtonGroup(pullBtn, pushBtn, "button-group--full");
  syncRow.append(syncGroup);

  // recompute from central rules
  const recomputeButtons = () => {
    const ev = GitRules.evaluate({
      status: currentStatus,
      progress: currentProgress,
      message: commitMessage,
      strictPush: true, // “no push before commit”
    });
    commitBtn.disabled = !ev.canCommit;
    pullBtn.disabled = !ev.canPull;
    pushBtn.disabled = !ev.canPush;
  };

  msgInput.addEventListener("input", () => {
    commitMessage = msgInput.value;
    recomputeButtons();
  });

  async function refreshStatusProgressAndList() {
    const [s, p] = await Promise.all([
      getStatus(gitPath),
      getProgressState(gitPath),
    ]);
    currentStatus = s || currentStatus;
    currentProgress = p || currentProgress;
    await gitListManager.loadList();
    EventBus.emit("status:update", { scope: "git-ui", action: "status" });
  }

  let gitListManager = null;

  const init = async () => {
    const listMgr = createListManager({
      elementId: fileListId,
      itemClass: "git-list-item",
      emptyMessage: t("modal.git.no.changes.detected"),
      fetchListFunction: async () => {
        const s = await getStatus(gitPath);
        currentStatus = s || currentStatus;
        const list = mapStatusFiles(currentStatus);
        return list;
      },
      renderItemExtra: async ({ flagNode, itemNode, rawData }) => {
        const { symbol, className } = normalizeFileStatus(rawData);

        const labelEl = itemNode.querySelector(".list-item-label");
        if (labelEl)
          labelEl.textContent = `${symbol || "??"}: ${
            rawData.display || rawData.value
          }`;

        itemNode.classList.remove(
          "added",
          "modified",
          "deleted",
          "renamed",
          "untracked",
          "ignored",
          "conflicted",
          "unknown"
        );
        itemNode.classList.add(className);

        const discardBtn = createGitDiscardButton(rawData.value, async () => {
          try {
            modalApi?.setDisabled?.();
            const confirmed = await showConfirmModal(
              "special.git.discard.sure",
              `<div class="modal-message-highlight"><code>${rawData.value}</code></div>`,
              {
                okKey: "button.git.discard",
                cancelKey: "standard.cancel",
                width: "auto",
                height: "auto",
              }
            );
            if (!confirmed) return;

            const result = await gitDiscard(gitPath, rawData.value);
            if (result?.success) {
              Toast.info("toast.git.discarded.changes.in", [rawData.value]);
              await refreshStatusProgressAndList();
            } else {
              Toast.error("toast.git.discard.failed", [rawData.value]);
            }
          } finally {
            modalApi?.setEnabled?.();
          }
        });
        flagNode.appendChild(discardBtn);
      },
    });

    gitListManager = listMgr;
    await gitListManager.loadList();

    // first compute
    recomputeButtons();

    // keep right pane in sync with external changes too
    const off = EventBus.on("status:update", async (e) => {
      if (e?.scope === "git") {
        const [s, p] = await Promise.all([
          getStatus(gitPath).catch(() => null),
          getProgressState(gitPath).catch(() => null),
        ]);
        if (s) currentStatus = s;
        if (p) currentProgress = p;
        recomputeButtons();
      }
    });
    // let modal clean it if you support destroy
    node._offGitStatusUpdate = off;

    requestAnimationFrame(() => translateDOM(node));
  };

  return { node, init };
}
