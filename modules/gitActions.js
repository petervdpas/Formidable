// modules/gitActions.js

import { EventBus } from "./eventBus.js";
import { buildButtonGroup } from "../utils/buttonUtils.js";
import {
  createGitCommitButton,
  createGitPushButton,
  createGitPullButton,
} from "./uiButtons.js";
import { createFormRowInput } from "../utils/elementBuilders.js";

// ─── Git Line Formatter ─────────────────────────────────────
function formatGitStatusLine(file) {
  const symbol = `${file.index || " "}${file.working_dir || " "}`.trim();
  console.log("formatGitStatusLine", file, "→", symbol);

  const cssClass =
    symbol === "A" || symbol === "A " || symbol === " A"
      ? "added"
      : symbol === "D" || symbol === "D " || symbol === " D"
      ? "deleted"
      : symbol === "M" || symbol === "M " || symbol === " M"
      ? "modified"
      : symbol === "R"
      ? "renamed"
      : symbol === "??"
      ? "untracked"
      : "unknown";

  const line = document.createElement("div");
  line.className = `git-change-line ${cssClass}`;
  line.textContent = `${symbol.padEnd(2)} ${file.path}`;
  return line;
}

// ─── Main Git Status Renderer ───────────────────────────────
export async function renderGitStatus(container) {
  container.innerHTML = "Loading Git status...";

  const config = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });

  const gitPath = config.git_root || ".";

  const refresh = () => renderGitStatus(container);

  EventBus.emit("git:status", {
    folderPath: gitPath,
    callback: (status) => {
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

      // ─── Changes Section (Colored) ───────────────────────
      const changesWrapper = document.createElement("div");
      changesWrapper.className = "git-plain-changes";

      if (status.files.length) {
        for (const file of status.files) {
          changesWrapper.appendChild(formatGitStatusLine(file));
        }
      } else {
        changesWrapper.textContent = "(No changes)";
      }

      container.appendChild(changesWrapper);

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

      const inputField = inputRow.querySelector("input, textarea");
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
            console.log("[GitResult]", result);

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
            console.log("[GitPushResult]", result);

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
            console.log("[GitPullResult]", result);

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
