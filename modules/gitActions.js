// modules/gitActions.js

import { EventBus } from "./eventBus.js";
import {
  createGitCommitButton,
  createGitPushButton,
  createGitPullButton,
  buildButtonGroup,
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

  const appRoot = await window.api.system.getAppRoot?.();
  const gitRoot = config.git_root || ".";
  const absGitPath = await window.api.system.resolvePath(appRoot, gitRoot);

  const refresh = () => renderGitStatus(container);

  EventBus.emit("git:status", {
    folderPath: absGitPath,
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
        folderPath: absGitPath,
        callback: (info) => {
          if (!info || !info.remotes.length) {
            remoteBox.innerHTML = `<p><strong>Remotes:</strong> None found</p>`;
            return;
          }

          const remoteList = info.remotes
            .map((r) => `${r.name}: ${r.refs.fetch}`)
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
          folderPath: absGitPath,
          message: commitMessage,
          callback: (result) => {
            EventBus.emit("ui:toast", {
              message: result || "Commit complete.",
              variant: "success",
            });
            refresh();
          },
        });
      }, !(hasChanges && commitMessage));

      const pushBtn = createGitPushButton(() => {
        EventBus.emit("git:push", {
          folderPath: absGitPath,
          callback: (result) => {
            EventBus.emit("ui:toast", {
              message: result || "Push complete.",
              variant: "success",
            });
            refresh();
          },
        });
      }, !canPush);

      const pullBtn = createGitPullButton(() => {
        EventBus.emit("git:pull", {
          folderPath: absGitPath,
          callback: (result) => {
            EventBus.emit("ui:toast", {
              message: result || "Pull complete.",
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
