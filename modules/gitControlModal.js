// modules/gitControlModal.js

import { EventBus } from "./eventBus.js";
import { buildButtonGroup } from "../utils/buttonUtils.js";
import { createGitCommitButton, createGitDiscardButton } from "./uiButtons.js";
import { createFormRowInput } from "../utils/elementBuilders.js";
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
// LEFT PANE
// ─────────────────────────────────────────────────────────────
export async function buildGitControlLeftPane({
  gitPath,
  status,
  remoteInfo,
  modalApi,
}) {
  const node = document.createElement("div");

  const ids = {
    remoteDD: uid("remote-dd"),
    remoteBranchDD: uid("remote-branch-dd"),
    branchRow: uid("branch-actions"),
    syncRow: uid("sync-row"),
    trackingRow: uid("tracking-row"),
    fetchBtn: uid("fetch"),
    checkoutBtn: uid("checkout"),
    trackBtn: uid("track"),
  };

  node.innerHTML = `
    <div class="git-section">
      <h3 style="margin-top:0">${
        t("modal.git.branches") || "Branches & Remote"
      }</h3>
      <div class="git-row">
        <div>Remote:</div>
        <div id="${ids.remoteDD}" style="flex:1"></div>
        <button class="btn" id="${ids.fetchBtn}">Fetch</button>
      </div>
      <div class="git-row">
        <div>Remote branch:</div>
        <div id="${ids.remoteBranchDD}" style="flex:1"></div>
        <button class="btn" id="${ids.checkoutBtn}">Checkout</button>
        <button class="btn" id="${ids.trackBtn}">Track (set upstream)</button>
      </div>
      <div class="git-row" id="${ids.branchRow}"></div>
      <hr/>
      <div class="git-row" id="${ids.syncRow}"></div>
      <div id="${ids.trackingRow}" style="font-size:12px;opacity:.9"></div>
    </div>
  `;

  const init = async () => {
    // remote dropdown
    const remotes = remoteInfo?.remotes?.map((r) => r.name) || [];
    let selectedRemote = remotes.includes("origin")
      ? "origin"
      : remotes[0] || "";
    createDropdown({
      containerId: ids.remoteDD,
      labelTextOrKey: "",
      options: remotes.map((n) => ({ value: n, label: n })),
      selectedValue: selectedRemote,
      onChange: (v) => {
        selectedRemote = v;
        rebuildRemoteBranches();
      },
    });

    // remote branches dropdown
    let selectedRemoteBranch = "";
    const rebuildRemoteBranches = () => {
      const branches = (remoteInfo?.remoteBranches || [])
        .filter((b) => selectedRemote && b.startsWith(`${selectedRemote}/`))
        .map((b) => b.replace(`${selectedRemote}/`, ""));
      selectedRemoteBranch = branches[0] || "";
      createDropdown({
        containerId: ids.remoteBranchDD,
        labelTextOrKey: "",
        options: branches.map((n) => ({ value: n, label: n })),
        selectedValue: selectedRemoteBranch,
        onChange: (v) => {
          selectedRemoteBranch = v;
        },
      });
    };
    rebuildRemoteBranches();

    // buttons (safe to bind via `node`, not document)
    const fetchBtn = node.querySelector(`#${ids.fetchBtn}`);
    const checkoutBtn = node.querySelector(`#${ids.checkoutBtn}`);
    const trackBtn = node.querySelector(`#${ids.trackBtn}`);

    fetchBtn.onclick = async () => {
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
    };

    checkoutBtn.onclick = async () => {
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
    };

    trackBtn.onclick = async () => {
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
    };

    // create local/track
    const branchRow = node.querySelector(`#${ids.branchRow}`);
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "new-branch-name";
    const createBtn = document.createElement("button");
    createBtn.className = "btn";
    createBtn.textContent = "Create & Checkout";
    const createTrackBtn = document.createElement("button");
    createTrackBtn.className = "btn";
    createTrackBtn.textContent = "Create, Checkout & Track";
    branchRow.append(nameInput, createBtn, createTrackBtn);

    createBtn.onclick = async () => {
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
    };
    createTrackBtn.onclick = async () => {
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
    };

    // pull/push + tracking
    const syncRow = node.querySelector(`#${ids.syncRow}`);
    const pullBtn = document.createElement("button");
    pullBtn.className = "btn";
    pullBtn.textContent = "Pull";
    const pushBtn = document.createElement("button");
    pushBtn.className = "btn";
    pushBtn.textContent = "Push";
    syncRow.append(buildButtonGroup(pullBtn, pushBtn));

    pullBtn.onclick = async () => {
      pullBtn.disabled = true;
      await EventBus.emitWithResponse("git:pull", { folderPath: gitPath });
      pullBtn.disabled = false;
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.pull.complete",
        variant: "success",
      });
    };
    pushBtn.onclick = async () => {
      pushBtn.disabled = true;
      await EventBus.emitWithResponse("git:push", { folderPath: gitPath });
      pushBtn.disabled = false;
      EventBus.emit("ui:toast", {
        languageKey: "toast.git.push.complete",
        variant: "success",
      });
    };

    const trackingRow = node.querySelector(`#${ids.trackingRow}`);
    trackingRow.innerHTML = `
      ${t("standard.branch") || "Branch"}: <b>${status.current}</b>
      <span class="git-badge">ahead: ${status.ahead || 0}</span>
      <span class="git-badge">behind: ${status.behind || 0}</span><br/>
      ${t("standard.tracked") || "Tracked"}: ${
      status.tracking || t("standard.none")
    }
    `;
  };

  return { node, init };
}

// ─────────────────────────────────────────────────────────────
// RIGHT PANE
// ─────────────────────────────────────────────────────────────
export async function buildGitControlRightPane({ gitPath, status, modalApi }) {
  const node = document.createElement("div");
  const fileListId = uid("git-file-list");
  const commitRowId = uid("commit-row");

  node.innerHTML = `
    <div class="git-section">
      <h3 style="margin-top:0">${
        t("modal.git.status") || "Status & Commit"
      }</h3>
      <div id="${fileListId}" class="git-file-list"></div>
      <div id="${commitRowId}" class="git-commit-row"></div>
    </div>
  `;

  const init = async () => {
    const gitListManager = createListManager({
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
              okKey: "standard.discard",
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

    // commit UI
    const commitRow = node.querySelector(`#${commitRowId}`);
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

    const msgField = inputRow.querySelector("textarea, input");
    msgField.addEventListener("input", () => {
      commitMessage = msgField.value.trim();
      commitBtn.disabled = !(hasChanges && commitMessage);
    });

    commitRow.append(inputRow, buildButtonGroup(commitBtn));
  };

  return { node, init };
}
