// modules/gitActions.js

import { EventBus } from "./eventBus.js";
import { buildButtonGroup } from "../utils/buttonUtils.js";
import {
  createGitCommitButton,
  createGitPushButton,
  createGitPullButton,
  createGitDiscardButton, // make sure this is implemented
} from "./uiButtons.js";
import { createFormRowInput } from "../utils/elementBuilders.js";
import { createListManager } from "../utils/listUtils.js";

export async function renderGitStatus(container) {
  container.innerHTML = "Loading Git status...";

  const config = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });

  const gitPath = config.git_root || ".";
  const refresh = () => renderGitStatus(container);
  const gitFileListId = "git-file-list";

  EventBus.emit("git:status", {
    folderPath: gitPath,
    callback: async (status) => {
      if (!status) {
        container.innerHTML = `<p>⚠️ Failed to fetch Git status.</p>`;
        return;
      }

      container.innerHTML = "";

      // ─── Summary ────────────────────────────────────────
      const summary = document.createElement("div");
      summary.className = "git-status-summary";
      summary.innerHTML = `
        <p style="margin-bottom: 0.3em;"><strong>Branch:</strong> ${
          status.current
        }</p>
        <p style="margin-bottom: 0.3em;"><strong>Tracking:</strong> ${
          status.tracking || "(none)"
        }</p>
        <p style="margin-bottom: 0.3em;"><strong>Changes:</strong> ${
          status.files.length
        } file(s)</p>
      `;
      container.appendChild(summary);

      // ─── File List ───────────────────────────────────────
      const listWrapper = document.createElement("div");
      listWrapper.id = gitFileListId;
      container.appendChild(listWrapper);

      const gitListManager = createListManager({
        elementId: gitFileListId,
        itemClass: "git-list-item",
        emptyMessage: "No changes detected.",
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

          // ─── Replace sublabel with inline prefix ─────────────
          const labelEl = itemNode.querySelector(".list-item-label");
          if (labelEl) {
            labelEl.textContent = `${symbol}: ${
              rawData.display || rawData.value
            }`;
          }

          // Remove subLabelNode if it exists
          if (subLabelNode?.parentNode) subLabelNode.remove();

          // ─── Status Class for background color ───────────────
          itemNode.classList.remove(
            "added",
            "modified",
            "deleted",
            "renamed",
            "untracked",
            "unknown"
          );

          const statusClass =
            symbol === "A" || index === "A" || work === "A"
              ? "added"
              : symbol === "D" || index === "D" || work === "D"
              ? "deleted"
              : symbol === "M" || index === "M" || work === "M"
              ? "modified"
              : symbol === "R" || index === "R" || work === "R"
              ? "renamed"
              : symbol === "??" || index === "??" || work === "??"
              ? "untracked"
              : "unknown";

          itemNode.classList.add(statusClass);

          // ─── Discard Button ──────────────────────────────────
          const discardBtn = createGitDiscardButton(rawData.value, async () => {
            const confirmed = window.confirm(
              `Discard changes in "${rawData.value}"?`
            );
            if (!confirmed) return;

            const result = await EventBus.emitWithResponse("git:discard", {
              folderPath: gitPath,
              filePath: rawData.value,
            });

            if (result?.success) {
              EventBus.emit("ui:toast", {
                message: `Discarded changes in ${rawData.value}`,
                variant: "info",
              });
              await gitListManager.loadList();
            } else {
              EventBus.emit("ui:toast", {
                message: `Failed to discard ${rawData.value}`,
                variant: "error",
              });
            }
          });

          flagNode.appendChild(discardBtn);
        },
        onItemClick: (filePath) => {
          console.log("[GitStatus] Selected file:", filePath);
        },
      });

      await gitListManager.loadList();

      // ─── Remotes Info ───────────────────────────────────
      const remoteBox = document.createElement("div");
      remoteBox.className = "git-remote-info";
      remoteBox.innerHTML = `<p style="margin-bottom: 0.3em;"><strong>Remotes:</strong> <em>Loading...</em></p>`;
      container.appendChild(remoteBox);

      EventBus.emit("git:remote-info", {
        folderPath: gitPath,
        callback: (info) => {
          if (!info || !info.remotes.length) {
            remoteBox.innerHTML = `<p><strong>Remotes:</strong> None found</p>`;
            return;
          }

          const remoteList = info.remotes
            .map((r) => {
              const decodedUrl = decodeURIComponent(r.refs.fetch);
              return `${r.name}: ${decodedUrl}`;
            })
            .join("<br>");

          remoteBox.innerHTML = `
            <p style="margin-bottom: 0.3em;"><strong>Remotes:</strong></p>
            <p style="font-family: monospace; font-size: 13px; margin: 0;">${remoteList}</p>
          `;
        },
      });

      // ─── Commit Message Input + Buttons ─────────────────
      let commitMessage = "";
      const hasChanges = status.files.length > 0;
      const canPush = status.ahead > 0 && !hasChanges;
      const canPull = status.behind > 0;

      const inputRow = createFormRowInput({
        id: "git-commit-message",
        label: "Commit Message",
        value: "",
        type: "textarea",
        multiline: true,
        placeholder: "e.g. Update README and fix typos",
        onSave: (msg) => {
          commitMessage = msg.trim();
          commitBtn.disabled = !(hasChanges && commitMessage);
        },
      });

      const inputField = inputRow.querySelector("textarea, input");
      inputField.addEventListener("input", () => {
        commitMessage = inputField.value.trim();
        commitBtn.disabled = !(hasChanges && commitMessage);
      });

      const commitBtn = createGitCommitButton(() => {
        if (!commitMessage) {
          EventBus.emit("ui:toast", {
            message: "Cannot commit: no message.",
            variant: "warning",
          });
          return;
        }

        EventBus.emit("git:commit", {
          folderPath: gitPath,
          message: commitMessage,
          callback: (result) => {
            EventBus.emit("ui:toast", {
              message:
                typeof result === "string"
                  ? result
                  : result?.summary
                  ? `Committed: ${result.summary.changes} change(s)`
                  : "Git operation complete.",
              variant: "success",
            });
            refresh();
          },
        });
      }, !(hasChanges && commitMessage));

      const pushBtn = createGitPushButton(() => {
        EventBus.emit("git:push", {
          folderPath: gitPath,
          callback: (result) => {
            EventBus.emit("ui:toast", {
              message:
                typeof result === "string"
                  ? result
                  : result?.summary
                  ? `Pushed: ${result.summary.changes ?? "✓"} change(s)`
                  : "Push complete.",
              variant: "success",
            });
            refresh();
          },
        });
      }, !canPush);

      const pullBtn = createGitPullButton(() => {
        EventBus.emit("git:pull", {
          folderPath: gitPath,
          callback: (result) => {
            EventBus.emit("ui:toast", {
              message:
                typeof result === "string"
                  ? result
                  : result?.files?.length
                  ? `Pulled: ${result.files.length} file(s)`
                  : "Pull complete.",
              variant: "success",
            });
            refresh();
          },
        });
      }, !canPull);

      container.appendChild(inputRow);
      container.appendChild(buildButtonGroup(commitBtn, pushBtn, pullBtn));
    },
  });
}
