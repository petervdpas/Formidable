// modules/gitControlModal.js

import { EventBus } from "./eventBus.js";
import { buildButtonGroup } from "../utils/buttonUtils.js";
import {
  createGitCommitButton,
  createGitDiscardButton,
  createGitFetchButton,
  createGitCheckoutButton,
  createGitTrackUpstreamButton,
  createGitCreateCheckoutButton,
  createGitCreateCheckoutTrackButton,
  createGitPullButton,
  createGitPushButton,
} from "./uiButtons.js";
import {
  addContainerElement,
  createFormRowInput,
} from "../utils/elementBuilders.js";
import { createListManager } from "../utils/listUtils.js";
import { showConfirmModal } from "../utils/modalUtils.js";
import { createDropdown } from "../utils/dropdownUtils.js";
import { t } from "../utils/i18n.js";

const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

// ─────────────────────────────────────────────────────────────
// Exported: fetch context once per open
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// LEFT PANE (buttons-first + addContainerElement everywhere)
// ─────────────────────────────────────────────────────────────
export async function buildGitControlLeftPane({
  gitPath,
  status,
  remoteInfo,
  modalApi,
}) {
  const node = document.createElement("div");

  // Containers
  const section = addContainerElement({
    parent: node,
    className: "git-section",
  });

  addContainerElement({
    parent: section,
    tag: "h3",
    textContent: t("modal.git.branches") || "Branches & Remote",
    attributes: { style: "margin-top:0" },
  });

  // Row: Remote
  const rowRemote = addContainerElement({
    parent: section,
    className: "git-row",
  });
  addContainerElement({
    parent: rowRemote,
    tag: "div",
    textContent: "Remote:",
  });
  const remoteDDWrap = addContainerElement({
    parent: rowRemote,
    tag: "div",
    attributes: { style: "flex:1" },
  });

  // Row: Remote branch
  const rowRemoteBranch = addContainerElement({
    parent: section,
    className: "git-row",
  });
  addContainerElement({
    parent: rowRemoteBranch,
    tag: "div",
    textContent: "Remote branch:",
  });
  const remoteBranchDDWrap = addContainerElement({
    parent: rowRemoteBranch,
    tag: "div",
    attributes: { style: "flex:1" },
  });

  // Row: Create local / track
  const branchRow = addContainerElement({
    parent: section,
    className: "git-row",
  });

  // Divider
  addContainerElement({ parent: section, tag: "hr" });

  // Row: Sync (pull/push)
  const syncRow = addContainerElement({
    parent: section,
    className: "git-row",
  });

  // Tracking summary
  const trackingRow = addContainerElement({
    parent: section,
    attributes: { style: "font-size:12px;opacity:.9" },
  });

  // ── State for dropdowns
  const remotes = remoteInfo?.remotes?.map((r) => r.name) || [];
  let selectedRemote = remotes.includes("origin") ? "origin" : remotes[0] || "";
  let selectedRemoteBranch = "";

  // ── BUTTONS FIRST (all consts from uiButtons)
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

  const trackBtn = createGitTrackUpstreamButton(async () => {
    if (!selectedRemote || !selectedRemoteBranch) return;
    await EventBus.emitWithResponse("git:set-upstream", {
      folderPath: gitPath,
      remote: selectedRemote,
      branch: selectedRemoteBranch,
    });
    EventBus.emit("ui:toast", {
      languageKey: "toast.git.track.set",
      variant: "success",
    });
  });

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "new-branch-name";

  const createBtn = createGitCreateCheckoutButton(async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    await EventBus.emitWithResponse("git:branch-create", {
      folderPath: gitPath,
      name,
      opts: { checkout: true },
    });
    EventBus.emit("ui:toast", {
      languageKey: "toast.git.branch.created",
      variant: "success",
    });
  });

  const createTrackBtn = createGitCreateCheckoutTrackButton(async () => {
    const name = nameInput.value.trim();
    if (!name || !selectedRemote) return;
    await EventBus.emitWithResponse("git:branch-create", {
      folderPath: gitPath,
      name,
      opts: { checkout: true },
    });
    await EventBus.emitWithResponse("git:set-upstream", {
      folderPath: gitPath,
      remote: selectedRemote,
      branch: name,
    });
    EventBus.emit("ui:toast", {
      languageKey: "toast.git.branch.created",
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

  // ── Mount buttons (then dropdowns)
  rowRemote.appendChild(fetchBtn);
  rowRemoteBranch.appendChild(checkoutBtn);
  rowRemoteBranch.appendChild(trackBtn);

  branchRow.appendChild(nameInput);
  branchRow.appendChild(createBtn);
  branchRow.appendChild(createTrackBtn);

  syncRow.append(buildButtonGroup(pullBtn, pushBtn));

  // ── Dropdowns (into the wrappers created above)
  const rebuildRemoteBranches = () => {
    // clear wrapper first to avoid stacking multiple selects
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
      onChange: (v) => {
        selectedRemoteBranch = v;
      },
    });
  };

  // Remote DD
  createDropdown({
    containerEl: remoteDDWrap,
    labelTextOrKey: "",
    options: remotes.map((n) => ({ value: n, label: n })),
    selectedValue: selectedRemote,
    onChange: (v) => {
      selectedRemote = v;
      rebuildRemoteBranches();
    },
  });

  rebuildRemoteBranches();

  // ── Tracking info (structured; no innerHTML)
  const renderTrackingRow = () => {
    trackingRow.innerHTML = "";
    const line1 = addContainerElement({ parent: trackingRow });
    addContainerElement({
      parent: line1,
      tag: "span",
      textContent: `${t("standard.branch") || "Branch"}: `,
    });
    const b = addContainerElement({
      parent: line1,
      tag: "b",
      textContent: status.current,
    });

    const badges = addContainerElement({ parent: trackingRow });
    addContainerElement({
      parent: badges,
      tag: "span",
      className: "git-badge",
      textContent: `ahead: ${status.ahead || 0}`,
    });
    addContainerElement({
      parent: badges,
      tag: "span",
      className: "git-badge",
      textContent: `behind: ${status.behind || 0}`,
      attributes: { style: "margin-left:6px" },
    });

    const line2 = addContainerElement({ parent: trackingRow });
    addContainerElement({
      parent: line2,
      tag: "span",
      textContent: `${t("standard.tracked") || "Tracked"}: ${
        status.tracking || t("standard.none")
      }`,
    });
  };
  renderTrackingRow();

  // Everything wired now; no deferred work needed
  return { node, init: async () => {} };
}

// ─────────────────────────────────────────────────────────────
// RIGHT PANE (buttons-first; addContainerElement; no innerHTML)
// ─────────────────────────────────────────────────────────────
export async function buildGitControlRightPane({ gitPath, status, modalApi }) {
  const node = document.createElement("div");

  // Containers
  const section = addContainerElement({
    parent: node,
    className: "git-section",
  });
  addContainerElement({
    parent: section,
    tag: "h3",
    textContent: t("modal.git.status") || "Status & Commit",
    attributes: { style: "margin-top:0" },
  });

  const fileListId = uid("git-file-list");
  const fileListWrap = addContainerElement({
    parent: section,
    className: "git-file-list",
    attributes: { id: fileListId },
  });

  const commitRowWrap = addContainerElement({
    parent: section,
    className: "git-commit-row",
  });

  // BUTTON FIRST: commit button with behavior
  let commitMessage = "";
  const hasChanges = (status.files || []).length > 0;

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

  // Input row (DOM-built; attach input listener to toggle commit button)
  const inputRow = createFormRowInput({
    id: "git-commit-message",
    labelOrKey: "modal.git.commit.message",
    value: "",
    type: "textarea",
    multiline: true,
    placeholder: t("modal.git.commit.placeholder"),
    onSave: undefined,
    i18nEnabled: true,
  });

  const msgField = inputRow.querySelector("textarea, input");
  msgField.addEventListener("input", () => {
    commitMessage = msgField.value.trim();
    commitBtn.disabled = !(
      (gitListManager?.currentList?.length ?? (status.files || []).length) >
        0 && commitMessage
    );
  });

  commitRowWrap.append(inputRow, buildButtonGroup(commitBtn));

  // List manager (wired in init to ensure it exists before listeners)
  let gitListManager = null;

  const init = async () => {
    gitListManager = createListManager({
      elementId: fileListId,
      itemClass: "git-list-item",
      emptyMessage: t("modal.git.no.changes.detected"),
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
      renderItemExtra: async ({
        subLabelNode,
        flagNode,
        itemNode,
        rawData,
      }) => {
        const index = (rawData.index || "").trim();
        const work = (rawData.working_dir || "").trim();
        const symbol = `${index}${work}`.trim() || "??";

        const labelEl = itemNode.querySelector(".list-item-label");
        if (labelEl)
          labelEl.textContent = `${symbol}: ${
            rawData.display || rawData.value
          }`;
        if (subLabelNode?.parentNode) subLabelNode.remove();

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

    await gitListManager.loadList();

    // Enable/disable commit button based on fresh list + message
    commitBtn.disabled = !(
      (gitListManager.currentList?.length || 0) > 0 && commitMessage
    );
  };

  return { node, init };
}
