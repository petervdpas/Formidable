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

/* ───────────────── helpers: events ───────────────── */
function pingGitUI(action) {
  EventBus.emit("git:ui:update", { scope: "git", action });
}

function emitStatusBar(
  languageKey,
  variant = "info",
  args = [],
  logOrigin = "GitControlModal"
) {
  EventBus.emit("status:update", {
    message: t(languageKey),
    languageKey,
    i18nEnabled: true,
    args,
    variant,
    log: true,
    logLevel: "default",
    logOrigin,
  });
}

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

export async function buildGitControlLeftPane({ gitPath, status, remoteInfo }) {
  const node = document.createElement("div");

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
      emitStatusBar("toast.git.fetch.complete", "success");
      await refreshRemoteBranches();
      pingGitUI("fetch");
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
    emitStatusBar("toast.git.checkout.complete", "success");
    pingGitUI("checkout");
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
    emitStatusBar("toast.git.branch.created", "success");
    nameInput.value = "";
    pingGitUI("branch-create");
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
          await mergeContinue(gitPath);
          Toast.success("toast.git.merge.continued");
          emitStatusBar("toast.git.merge.continued", "success");
        } catch (e) {
          Toast.error(String(e?.message || t("git.error.unknown")));
          emitStatusBar("git.error.unknown", "error");
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
          await mergeAbort(gitPath);
          Toast.success("toast.git.merge.aborted");
          emitStatusBar("toast.git.merge.aborted", "success");
        } catch (e) {
          Toast.error(String(e?.message || t("git.error.unknown")));
          emitStatusBar("git.error.unknown", "error");
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
          await rebaseContinue(gitPath);
          Toast.success("toast.git.rebase.continued");
          emitStatusBar("toast.git.rebase.continued", "success");
        } catch (e) {
          Toast.error(String(e?.message || t("git.error.unknown")));
          emitStatusBar("git.error.unknown", "error");
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
          await rebaseAbort(gitPath);
          Toast.success("toast.git.rebase.aborted");
          emitStatusBar("toast.git.rebase.aborted", "success");
        } catch (e) {
          Toast.error(String(e?.message || t("git.error.unknown")));
          emitStatusBar("git.error.unknown", "error");
        } finally {
          await refreshProgress();
          setBusy(conflictSection, false);
        }
      });

      topBar.append(cont, abort);
    }

    if ((s.conflicted?.length || 0) > 1) {
      const spacer = document.createElement("div");
      spacer.style.flex = "1";
      topBar.appendChild(spacer);

      const allOurs = document.createElement("button");
      allOurs.className = "btn btn--small";
      allOurs.textContent = t("git.pick.ours.all") || "Resolve all as Local";
      allOurs.addEventListener("click", async () => {
        try {
          setBusy(conflictSection, true);
          for (const f of s.conflicted) {
            await chooseOurs(gitPath, f);
          }
          Toast.success("toast.git.resolved.ours.all");
          emitStatusBar("toast.git.resolved.ours.all", "success");
        } catch (e) {
          Toast.error(String(e?.message || t("git.error.unknown")));
          emitStatusBar("git.error.unknown", "error");
        } finally {
          await refreshProgress();
          setBusy(conflictSection, false);
        }
      });

      const allTheirs = document.createElement("button");
      allTheirs.className = "btn btn--small";
      allTheirs.textContent =
        t("git.pick.theirs.all") || "Resolve all as Remote";
      allTheirs.addEventListener("click", async () => {
        try {
          setBusy(conflictSection, true);
          for (const f of s.conflicted) {
            await chooseTheirs(gitPath, f);
          }
          Toast.success("toast.git.resolved.theirs.all");
          emitStatusBar("toast.git.resolved.theirs.all", "success");
        } catch (e) {
          Toast.error(String(e?.message || t("git.error.unknown")));
          emitStatusBar("git.error.unknown", "error");
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
      btnOurs.textContent = t("git.pick.ours") || "Local Version";
      btnOurs.addEventListener("click", async () => {
        try {
          setBusy(row, true);
          await chooseOurs(gitPath, file);
          Toast.success("toast.git.resolved.ours");
          emitStatusBar("toast.git.resolved.ours", "success");
        } catch (e) {
          Toast.error(String(e?.message || t("git.error.unknown")));
          emitStatusBar("git.error.unknown", "error");
        } finally {
          await refreshProgress();
          setBusy(row, false);
        }
      });

      const btnTheirs = document.createElement("button");
      btnTheirs.className = "btn btn--small";
      btnTheirs.textContent = t("git.pick.theirs") || "Remote Version";
      btnTheirs.addEventListener("click", async () => {
        try {
          setBusy(row, true);
          await chooseTheirs(gitPath, file);
          Toast.success("toast.git.resolved.theirs");
          emitStatusBar("toast.git.resolved.theirs", "success");
        } catch (e) {
          Toast.error(String(e?.message || t("git.error.unknown")));
          emitStatusBar("git.error.unknown", "error");
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
          await openMergetool(gitPath, file);
        } finally {
          setBusy(row, false);
          Toast.info("Mergetool launched");
          emitStatusBar("git.mergetool.open", "info"); // optional
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
    pingGitUI("progress");
  }

  const off = EventBus.on("git:ui:update", (e) => {
    // if something changed elsewhere, refresh left pane progress UI
    if (!e) return;
    if (e.action === "progress" || e.action === "status") return;
    refreshProgress();
  });

  await refreshProgress();

  return {
    node,
    init: async () => requestAnimationFrame(() => translateDOM(node)),
    destroy: () => off?.(),
  };
}

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
      emitStatusBar("toast.git.commit.noMessage", "warning");
      return;
    }
    commitBtn.disabled = true;
    try {
      const res = await gitCommit(gitPath, commitMessage);
      if (typeof res === "string") {
        Toast.success("toast.git.commit.complete");
        emitStatusBar("toast.git.commit.complete", "success");
      } else if (res?.summary?.changes != null) {
        Toast.success("toast.git.commit.success", [res.summary.changes]);
        emitStatusBar("toast.git.commit.success", "success", [
          res.summary.changes,
        ]);
      } else {
        Toast.success("toast.git.commit.complete");
        emitStatusBar("toast.git.commit.complete", "success");
      }
      msgInput.value = "";
      commitMessage = "";
      await refreshStatusProgressAndList();
      pingGitUI("commit");
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
        emitStatusBar("toast.git.pull.complete", "success");
      } else if (changed) {
        Toast.success("toast.git.pull.changes", [
          sum.changes,
          sum.deletions,
          sum.insertions,
        ]);
        emitStatusBar("toast.git.pull.changes", "success", [
          sum.changes,
          sum.deletions,
          sum.insertions,
        ]);
      } else {
        Toast.info("toast.git.pull.noChanges");
        emitStatusBar("toast.git.pull.noChanges", "info");
      }
      await refreshStatusProgressAndList();
      pingGitUI("pull");
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
        emitStatusBar("toast.git.push.range", "success", [
          branch,
          fromShort,
          toShort,
        ]);
      } else {
        Toast.success("toast.git.push.complete");
        emitStatusBar("toast.git.push.complete", "success");
      }
      await refreshStatusProgressAndList();
      pingGitUI("push");
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

  const recomputeButtons = () => {
    const ev = GitRules.evaluate({
      status: currentStatus,
      progress: currentProgress,
      message: commitMessage,
      strictPush: true,
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
    // internal ping; not a status-bar message
    pingGitUI("status");
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
              emitStatusBar("toast.git.discarded.changes.in", "info", [
                rawData.value,
              ]);
              await refreshStatusProgressAndList();
              pingGitUI("discard");
            } else {
              Toast.error("toast.git.discard.failed", [rawData.value]);
              emitStatusBar("toast.git.discard.failed", "error", [
                rawData.value,
              ]);
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

    recomputeButtons();

    const off = EventBus.on("git:ui:update", async (e) => {
      // When other git actions happen elsewhere, recompute button states
      if (!e) return;
      const [s, p] = await Promise.all([
        getStatus(gitPath).catch(() => null),
        getProgressState(gitPath).catch(() => null),
      ]);
      if (s) currentStatus = s;
      if (p) currentProgress = p;
      recomputeButtons();
    });
    node._offGitStatusUpdate = off;

    requestAnimationFrame(() => translateDOM(node));
  };

  return { node, init };
}
