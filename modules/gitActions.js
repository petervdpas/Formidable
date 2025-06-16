// modules/gitActions.js

import { EventBus } from "./eventBus.js";
import {
  createGitCommitButton,
  createGitPushButton,
  createGitPullButton,
  buildButtonGroup,
} from "./uiButtons.js";

import { createFormRowInput } from "../utils/elementBuilders.js";

export async function renderGitStatus(container) {
  container.innerHTML = "Loading Git status...";

  const config = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });

  const appRoot = await window.api.system.getAppRoot?.();
  const gitRoot = config.git_root || ".";
  const absGitPath = await window.api.system.resolvePath(appRoot, gitRoot);

  const refresh = () => renderGitStatus(container); // reuse after commit/push

  EventBus.emit("git:status", {
    folderPath: absGitPath,
    callback: (status) => {
      if (!status) {
        container.innerHTML = `<p>⚠️ Failed to fetch Git status.</p>`;
        return;
      }

      // ─── Git Status Summary ─────────────────────────────
      const summary = document.createElement("div");
      summary.className = "git-status-summary";
      summary.innerHTML = `
        <p><strong>Branch:</strong> ${status.current}</p>
        <p><strong>Tracking:</strong> ${status.tracking || "(none)"}</p>
        <p><strong>Changes:</strong> ${status.files.length} file(s)</p>
        <ul>
          ${status.files
            .map((f) => `<li>${f.path} (${f.index}/${f.working_dir})</li>`)
            .join("")}
        </ul>
      `;

      container.innerHTML = "";
      container.appendChild(summary);

      // ─── Commit Message Input ───────────────────────────
      let commitMessage = "";
      const hasChanges = status.files.length > 0;
      const canPush = status.ahead > 0 && !hasChanges;
      const canPull = status.behind > 0;

      const inputRow = createFormRowInput({
        id: "git-commit-message",
        label: "Commit Message",
        value: "",
        placeholder: "e.g. Update README and fix typos",
        onSave: (msg) => {
          commitMessage = msg.trim();
          commitBtn.disabled = !(hasChanges && commitMessage);
        },
      });

      const inputField = inputRow.querySelector("input");
      inputField.addEventListener("input", () => {
        commitMessage = inputField.value.trim();
        commitBtn.disabled = !(hasChanges && commitMessage);
      });

      // ─── Buttons with external logic ─────────────────────
      const commitBtn = createGitCommitButton(async () => {
        if (!commitMessage) {
          EventBus.emit("status:update", "Cannot commit: no message.");
          return;
        }
        EventBus.emit("git:commit", {
          folderPath: absGitPath,
          message: commitMessage,
          callback: (result) => {
            EventBus.emit("status:update", result || "Commit complete.");
            refresh(); // reload status
          },
        });
      }, !(hasChanges && commitMessage));

      const pushBtn = createGitPushButton(() => {
        EventBus.emit("git:push", {
          folderPath: absGitPath,
          callback: (result) => {
            EventBus.emit("status:update", result || "Push complete.");
            refresh(); // reload status
          },
        });
      }, !canPush);

      const pullBtn = createGitPullButton(() => {
        EventBus.emit("git:pull", {
          folderPath: absGitPath,
          callback: (result) => {
            EventBus.emit("status:update", result || "Pull complete.");
            refresh(); // reload status
          },
        });
      }, !canPull);

      container.appendChild(inputRow);
      container.appendChild(buildButtonGroup(commitBtn, pushBtn, pullBtn));
    },
  });
}
