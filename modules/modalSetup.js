// modules/setupModal.js

import { setupModal } from "./modalManager.js";
import { updateStatus } from "./statusManager.js";

export function setupSettingsModal(themeToggle, contextToggle) {
  return setupModal("settings-modal", {
    closeBtn: "settings-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "30em",
    height: "auto",
    onOpen: async () => {
      const config = await window.configAPI.loadUserConfig();
      themeToggle.checked = config.theme === "dark";
      contextToggle.checked = config.context_mode === "markdown";

      const defaultDirInput = document.getElementById("default-dir");
      const chooseDirBtn = document.getElementById("choose-dir");

      defaultDirInput.value = config.default_markdown_dir || "./markdowns";

      chooseDirBtn.onclick = async () => {
        const selected = await window.dialogAPI.chooseDirectory();
        if (selected) {
          const appRoot = (await window.api.getAppRoot?.()) || ".";
          const relativePath = selected.startsWith(appRoot)
            ? "./" +
              selected
                .slice(appRoot.length)
                .replace(/^[\\/]/, "")
                .replace(/\\/g, "/")
            : selected;

          defaultDirInput.value = relativePath;
          await window.configAPI.updateUserConfig({
            default_markdown_dir: relativePath,
          });
          updateStatus(`Updated default markdown dir: ${relativePath}`);
        }
      };
    },
  });
}

export function setupEntryModal() {
  return setupModal("entry-modal", {
    closeBtn: "entry-cancel",
    escToClose: true,
    backdropClick: true,
    width: "30em",
    height: "auto",
  });
}

export function setupTemplateModal() {
  return setupModal("template-modal", {
    closeBtn: "template-cancel",
    escToClose: true,
    backdropClick: true,
    width: "30em",
    height: "auto",
  });
}
