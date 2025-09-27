// modules/gitActions.js

import { EventBus } from "./eventBus.js";
import { buildButtonGroup } from "../utils/buttonUtils.js";
import {
  createGitCommitButton,
  createGitPushButton,
  createGitPullButton,
  createGitDiscardButton,
} from "./uiButtons.js";
import { createFormRowInput } from "../utils/elementBuilders.js";
import { createListManager } from "../utils/listUtils.js";
import { showConfirmModal } from "../utils/modalUtils.js";
import { t } from "../utils/i18n.js";
import { Toast } from "../utils/toastUtils.js";
import {
  loadConfig,
  resolveGitPath,
  getStatus,
  getRemoteInfo,
  commit as gitCommit,
  push as gitPush,
  pull as gitPull,
  discardFile as gitDiscard,
  mapStatusFiles,
  normalizeFileStatus,
} from "../utils/gitUtils.js";

export async function renderGitStatus(container, modalApi) {
  container.innerHTML = t("modal.git.loading.status");

  // Resolve repo path via gitUtils (supports positional callback config load)
  const cfg = await loadConfig();
  const gitPath = resolveGitPath(cfg);

  // Helper to refresh this view
  const refresh = () => renderGitStatus(container, modalApi);
  const gitFileListId = "git-file-list";

  // Load status once up-front
  const status = await getStatus(gitPath);
  if (!status) {
    container.innerHTML = `<p>${t("modal.git.error.status")}</p>`;
    return;
  }

  container.innerHTML = "";

  // ─── Summary ─────────────────────────────────────────────
  const summary = document.createElement("div");
  summary.className = "git-status-summary";
  const filesCount = status.files?.length ?? 0;
  summary.innerHTML = `
    <p style="margin-bottom:0.3em;"><strong>Branch:</strong> ${
      status.current ?? "-"
    }</p>
    <p style="margin-bottom:0.3em;"><strong>Tracked:</strong> ${
      status.tracking || t("standard.none")
    }</p>
    <p style="margin-bottom:0.3em;"><strong>${t(
      "standard.changes"
    )}:</strong> ${filesCount} ${t("standard.file.s")}</p>
  `;
  container.appendChild(summary);

  // ─── File List ──────────────────────────────────────────
  const listWrapper = document.createElement("div");
  listWrapper.id = gitFileListId;
  container.appendChild(listWrapper);

  const gitListManager = createListManager({
    elementId: gitFileListId,
    itemClass: "git-list-item",
    emptyMessage: t("modal.git.no.changes.detected"),
    fetchListFunction: async () => {
      const s = await getStatus(gitPath);
      return mapStatusFiles(s); // ← single source of truth
    },
    renderItemExtra: async ({ subLabelNode, flagNode, itemNode, rawData }) => {
      const { symbol, className } = normalizeFileStatus(rawData);

      // Label with short status prefix
      const labelEl = itemNode.querySelector(".list-item-label");
      if (labelEl) {
        labelEl.textContent = `${symbol || "??"}: ${
          rawData.display || rawData.value
        }`;
      }
      if (subLabelNode?.parentNode) subLabelNode.remove();

      // Row coloring by normalized class
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

      // Discard button
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
    onItemClick: (filePath) => {
      EventBus.emit("logging:default", [
        "[GitStatus] Selected file:",
        filePath,
      ]);
    },
  });

  await gitListManager.loadList();

  // ─── Remotes Info ───────────────────────────────────────
  const remoteBox = document.createElement("div");
  remoteBox.className = "git-remote-info";
  remoteBox.innerHTML = `<p style="margin-bottom:0.3em;"><strong>Remote:</strong> <em>${t(
    "standard.loading"
  )}</em></p>`;
  container.appendChild(remoteBox);

  (async () => {
    const info = await getRemoteInfo(gitPath);
    if (!info || !info.remotes?.length) {
      remoteBox.innerHTML = `<p><strong>Remote:</strong> ${t(
        "modal.git.none.found"
      )}</p>`;
      return;
    }
    const remoteList = info.remotes
      .map((r) => {
        const decodedUrl = decodeURIComponent(r.refs.fetch || "");
        return `${r.name}: ${decodedUrl}`;
      })
      .join("<br>");
    remoteBox.innerHTML = `
      <p style="margin-bottom:0.3em;"><strong>Remote:</strong></p>
      <p style="font-family:monospace;font-size:13px;margin:0;">${remoteList}</p>
    `;
  })();

  // ─── Commit Message Input + Buttons ─────────────────────
  let commitMessage = "";
  const hasLocalChanges = (status.files?.length ?? 0) > 0;
  const canPush = (status.ahead || 0) > 0 && !hasLocalChanges;
  const canPull = Boolean(status.tracking); // pull allowed if tracking exists

  const inputRow = createFormRowInput({
    id: "git-commit-message",
    labelOrKey: "modal.git.commit.message",
    value: "",
    type: "textarea",
    multiline: true,
    placeholder: t("modal.git.commit.placeholder"),
    onSave: (msg) => {
      commitMessage = (msg || "").trim();
      commitBtn.disabled = !(hasLocalChanges && commitMessage);
    },
    i18nEnabled: true,
  });

  const inputField = inputRow.querySelector("textarea, input");
  inputField.addEventListener("input", () => {
    commitMessage = (inputField.value || "").trim();
    commitBtn.disabled = !(hasLocalChanges && commitMessage);
  });

  const commitBtn = createGitCommitButton(async () => {
    if (!commitMessage) {
      Toast.warning("toast.git.commit.noMessage");
      return;
    }
    commitBtn.disabled = true;
    try {
      const result = await gitCommit(gitPath, commitMessage);
      if (typeof result === "string") {
        Toast.success("toast.git.commit.complete");
      } else if (result?.summary?.changes != null) {
        Toast.success("toast.git.commit.success", [result.summary.changes]);
      } else {
        Toast.success("toast.git.commit.complete");
      }
      await refresh();
    } finally {
      commitBtn.disabled = false;
    }
  }, !(hasLocalChanges && commitMessage));

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
      await refresh();
    } finally {
      pushBtn.disabled = false;
    }
  }, !canPush);

  const pullBtn = createGitPullButton(async () => {
    pullBtn.disabled = true;
    try {
      const result = await gitPull(gitPath);
      const summary = result?.summary;
      const changed =
        summary &&
        (summary.changes > 0 ||
          summary.deletions > 0 ||
          summary.insertions > 0);

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
      await refresh();
    } finally {
      pullBtn.disabled = false;
    }
  }, !canPull);

  container.appendChild(inputRow);
  container.appendChild(buildButtonGroup(commitBtn, pushBtn, pullBtn));
}
