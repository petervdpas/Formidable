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
} from "../utils/gitUtils.js";

const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

// Gather current git context via utils
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

// Build the left pane for the Git control modal
export async function buildGitControlLeftPane({ gitPath, status, remoteInfo }) {
  const node = document.createElement("div");

  const section = addContainerElement({
    parent: node,
    className: "git-section",
  });
  addContainerElement({
    parent: section,
    tag: "h3",
    i18nKey: "modal.git.branches",
    attributes: { style: "margin-top:0" },
  });

  // State
  const remotes = remoteInfo?.remotes?.map((r) => r.name) || [];
  let selectedRemote = remotes.includes("origin") ? "origin" : remotes[0] || "";
  let selectedRemoteBranch = "";

  // Buttons
  const fetchBtn = createGitFetchButton(async () => {
    try {
      fetchBtn.disabled = true;
      await EventBus.emitWithResponse("git:fetch", {
        folderPath: gitPath,
        remote: selectedRemote,
        opts: ["--prune"],
      });
      Toast.success("toast.git.fetch.complete");
    } finally {
      fetchBtn.disabled = false;
    }
  });

  const checkoutBtn = createGitCheckoutButton(async () => {
    if (!selectedRemote || !selectedRemoteBranch) return;
    // Create local branch from remote branch & set upstream
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

  const pullBtn = createGitPullButton(async () => {
    try {
      pullBtn.disabled = true;
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
    } finally {
      pullBtn.disabled = false;
    }
  });

  const pushBtn = createGitPushButton(async () => {
    try {
      pushBtn.disabled = true;
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
    } finally {
      pushBtn.disabled = false;
    }
  });

  // Keep references used by both rows
  let remoteBranchDDWrap = null;
  let rebuildRemoteBranches = () => {};

  // Remote: label + dropdown + Fetch
  section.appendChild(
    buildLabeledControl({
      labelTextOrKey: "standard.git.remote",
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

  // Remote branch: label + dropdown + Checkout
  section.appendChild(
    buildLabeledControl({
      labelTextOrKey: "standard.git.branches",
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

  // Branch creation: label + input + Create&Checkout
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = "git-new-branch";
  nameInput.setAttribute(
    "data-i18n-placeholder",
    "standard.git.branch.new.placeholder"
  );
  nameInput.placeholder = "";

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
  });

  section.appendChild(
    buildLabeledControl({
      labelTextOrKey: "standard.git.branch.new",
      i18nEnabled: true,
      forId: nameInput.id,
      layout: "two-column",
      labelWidth: "120px",
      control: nameInput,
      actions: [createBtn],
    })
  );

  addContainerElement({ parent: section, tag: "hr" });

  // Pull / Push
  const syncRow = addContainerElement({
    parent: section,
    className: "git-row",
  });
  syncRow.append(buildButtonGroup(pullBtn, pushBtn));

  // Tracking summary
  const trackingRow = addContainerElement({
    parent: section,
    attributes: { style: "font-size:12px;opacity:.9" },
  });

  const renderTrackingRow = () => {
    trackingRow.innerHTML = "";

    const line1 = addContainerElement({ parent: trackingRow });
    addContainerElement({
      parent: line1,
      tag: "span",
      i18nKey: "standard.git.branch",
    });
    addContainerElement({ parent: line1, tag: "span", textContent: ": " });
    addContainerElement({
      parent: line1,
      tag: "b",
      textContent: status.current || "",
    });

    const badges = addContainerElement({ parent: trackingRow });
    makeGitBadge({
      parent: badges,
      key: "standard.git.badge.ahead",
      count: status.ahead,
    });
    makeGitBadge({
      parent: badges,
      key: "standard.git.badge.behind",
      count: status.behind,
      marginLeft: "6px",
    });
    if (status.ahead && status.behind) {
      makeGitBadge({
        parent: badges,
        key: "standard.git.badge.diverged",
        count: Math.min(status.ahead, status.behind),
        marginLeft: "6px",
      });
    }

    const line2 = addContainerElement({ parent: trackingRow });
    addContainerElement({
      parent: line2,
      tag: "span",
      i18nKey: "standard.git.tracked",
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

  return {
    node,
    init: async () => requestAnimationFrame(() => translateDOM(node)),
  };
}

// Build the right pane for the Git control modal
export async function buildGitControlRightPane({ gitPath, status, modalApi }) {
  const node = document.createElement("div");

  const section = addContainerElement({
    parent: node,
    className: "git-section",
  });
  addContainerElement({
    parent: section,
    tag: "h3",
    i18nKey: "modal.git.status",
    attributes: { style: "margin-top:0" },
  });

  const fileListId = uid("git-file-list");
  addContainerElement({
    parent: section,
    className: "git-file-list",
    attributes: { id: fileListId },
  });

  let commitMessage = "";
  const hasChanges = (status.files || []).length > 0;
  let gitListManager = null;

  const commitBtn = createGitCommitButton(async () => {
    if (!commitMessage) {
      Toast.warning("toast.git.commit.noMessage");
      return;
    }
    const res = await gitCommit(gitPath, commitMessage);
    if (typeof res === "string") {
      Toast.success("toast.git.commit.complete");
    } else if (res?.summary?.changes != null) {
      Toast.success("toast.git.commit.success", [res.summary.changes]);
    } else {
      Toast.success("toast.git.commit.complete");
    }
    await gitListManager.loadList();
  }, !(hasChanges && commitMessage));

  const msgInput = document.createElement("textarea");
  msgInput.id = "git-commit-message";
  msgInput.placeholder = t("modal.git.commit.placeholder");
  msgInput.addEventListener("input", () => {
    commitMessage = msgInput.value.trim();
    const changesCount =
      gitListManager?.currentList?.length ??
      (status.files ? status.files.length : 0);
    commitBtn.disabled = !(changesCount > 0 && commitMessage);
  });

  section.appendChild(
    buildLabeledControl({
      labelTextOrKey: "modal.git.commit.message",
      i18nEnabled: true,
      forId: msgInput.id,
      layout: "stacked",
      labelWidth: "140px",
      control: msgInput,
      actions: [commitBtn],
    })
  );

  const init = async () => {
    const listMgr = createListManager({
      elementId: fileListId,
      itemClass: "git-list-item",
      emptyMessage: "",
      fetchListFunction: async () => {
        const s = await getStatus(gitPath);
        return mapStatusFiles(s);
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
                okKey: "standard.git.discard",
                cancelKey: "standard.cancel",
                width: "auto",
                height: "auto",
              }
            );
            if (!confirmed) return;

            const result = await gitDiscard(gitPath, rawData.value);
            if (result?.success) {
              Toast.info("toast.git.discarded.changes.in", [rawData.value]);
              await gitListManager.loadList();
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

    commitBtn.disabled = !(
      (gitListManager.currentList?.length || 0) > 0 && commitMessage
    );
    requestAnimationFrame(() => translateDOM(node));
  };

  return { node, init };
}
