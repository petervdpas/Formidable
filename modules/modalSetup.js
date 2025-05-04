// modules/setupModal.js

import { setupModal } from "./modalManager.js";
import { EventBus } from "./eventBus.js";

export function setupSettingsModal(themeToggle, contextToggle) {
  return setupModal("settings-modal", {
    closeBtn: "settings-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "30em",
    height: "auto",

    onOpen: async () => {
      const config = await window.api.config.loadUserConfig();

      // Just emit event to trigger handlers elsewhere
      EventBus.emit("theme:toggle", config.theme);

      const defaultDirInput = document.getElementById("default-dir");
      const chooseDirBtn = document.getElementById("choose-dir");

      defaultDirInput.value = config.default_markdown_dir || "./markdowns";

      chooseDirBtn.onclick = async () => {
        const selected = await window.api.dialog.chooseDirectory();
        if (selected) {
          const appRoot = (await window.api.system.getAppRoot?.()) || ".";
          const relativePath = selected.startsWith(appRoot)
            ? "./" +
              selected.slice(appRoot.length).replace(/^[\\/]/, "").replace(/\\/g, "/")
            : selected;

          defaultDirInput.value = relativePath;

          await window.api.config.updateUserConfig({
            default_markdown_dir: relativePath,
          });

          EventBus.emit("status:update", `Updated default markdown dir: ${relativePath}`);
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

export function setupAboutModal() {
  return setupModal("about-modal", {
    closeBtn: "about-close",
    escToClose: true,
    backdropClick: true,
    resizable: false,
    width: "25em",
    height: "auto",
  });
}
