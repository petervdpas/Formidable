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

const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export async function getGitContext() {
  const config = await new Promise((resolve) =>
    EventBus.emit("config:load", (cfg) => resolve(cfg))
  );
  const gitPath = config.git_root || ".";
  const [status, remoteInfo] = await Promise.all([
    new Promise((resolve) =>
      EventBus.emit("git:status", { folderPath: gitPath, callback: resolve })
    ),
    new Promise((resolve) =>
      EventBus.emit("git:remote-info", {
        folderPath: gitPath,
        callback: resolve,
      })
    ),
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
    fetchBtn.disabled = true;
    await EventBus.emitWithResponse("git:fetch", {
      folderPath: gitPath,
      remote: selectedRemote,
      opts: ["--prune"],
    });
    fetchBtn.disabled = false;
    EventBus.emit("ui:toast", {
      languageKey: "toast.git.fetch.complete",
      variant: "success",
    });
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
    EventBus.emit("ui:toast", {
      languageKey: "toast.git.checkout.complete",
      variant: "success",
    });
  });

  const pullBtn = createGitPullButton(async () => {
    pullBtn.disabled = true;
    await EventBus.emitWithResponse("git:pull", { folderPath: gitPath });
    pullBtn.disabled = false;
    EventBus.emit("ui:toast", {
      languageKey: "toast.git.pull.complete",
      variant: "success",
    });
  });

  const pushBtn = createGitPushButton(async () => {
    pushBtn.disabled = true;
    await EventBus.emitWithResponse("git:push", { folderPath: gitPath });
    pushBtn.disabled = false;
    EventBus.emit("ui:toast", {
      languageKey: "toast.git.push.complete",
      variant: "success",
    });
  });

  // Keep references used by both rows
  let remoteBranchDDWrap = null;
  let rebuildRemoteBranches = () => {};

  // Remote: label + dropdown + Fetch
  section.appendChild(
    buildLabeledControl({
      labelTextOrKey: "standard.git.remote", // correct i18n key
      i18nEnabled: true,
      layout: "two-column",
      labelWidth: "120px",
      control: (mount) => {
        createDropdown({
          containerEl: mount,
          labelTextOrKey: "", // inner label suppressed by builder
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
    EventBus.emit("ui:toast", {
      languageKey: "toast.git.branch.created",
      variant: "success",
    });
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
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.commit.noMessage",
        variant: "warning",
      });
      return;
    }
    const res = await EventBus.emitWithResponse("git:commit", {
      folderPath: gitPath,
      message: commitMessage,
    });
    if (typeof res === "string") {
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.commit.complete",
        variant: "success",
      });
    } else if (res?.summary?.changes != null) {
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.commit.success",
        args: [res.summary.changes],
        variant: "success",
      });
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
        const result = await new Promise((resolve) =>
          EventBus.emit("git:status", {
            folderPath: gitPath,
            callback: resolve,
          })
        );
        return (
          result?.files?.map((file) => ({
            display: file.path,
            value: file.path,
            index: file.index,
            working_dir: file.working_dir,
          })) || []
        );
      },
      renderItemExtra: async ({ flagNode, itemNode, rawData }) => {
        const index = (rawData.index || "").trim();
        const work = (rawData.working_dir || "").trim();
        const symbol = `${index}${work}`.trim() || "??";

        const labelEl = itemNode.querySelector(".list-item-label");
        if (labelEl)
          labelEl.textContent = `${symbol}: ${
            rawData.display || rawData.value
          }`;

        itemNode.classList.remove(
          "added",
          "modified",
          "deleted",
          "renamed",
          "untracked",
          "unknown"
        );
        itemNode.classList.add(
          symbol.includes("A")
            ? "added"
            : symbol.includes("D")
            ? "deleted"
            : symbol.includes("M")
            ? "modified"
            : symbol.includes("R")
            ? "renamed"
            : symbol === "??"
            ? "untracked"
            : "unknown"
        );

        const discardBtn = createGitDiscardButton(rawData.value, async () => {
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
          if (!confirmed) return modalApi?.setEnabled?.();

          const result = await EventBus.emitWithResponse("git:discard", {
            folderPath: gitPath,
            filePath: rawData.value,
          });

          if (result?.success) {
            EventBus.emit("ui:toast", {
              languageKey: "toast.git.discarded.changes.in",
              args: [rawData.value],
              variant: "info",
            });
            await gitListManager.loadList();
          } else {
            EventBus.emit("ui:toast", {
              languageKey: "toast.git.discard.failed",
              args: [rawData.value],
              variant: "error",
            });
          }
          modalApi?.setEnabled?.();
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
