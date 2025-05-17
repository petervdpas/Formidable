// modules/setupModal.js

import { setupModal } from "./modalManager.js";
import { EventBus } from "./eventBus.js";
import { fieldTypes } from "../utils/fieldTypes.js";
import { formatAsRelativePath } from "../utils/pathUtils.js";
import { applyModalCssClass } from "../utils/modalUtils.js";
import { extractFieldDefinition } from "../utils/formUtils.js";
import { createDropdown } from "./dropdownManager.js";

export function setupSettingsModal(themeToggle, contextToggle) {
  return setupModal("settings-modal", {
    closeBtn: "settings-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "26em",
    height: "auto",

    onOpen: async () => {
      const config = await window.api.config.loadUserConfig();

      // Just emit event to trigger handlers elsewhere
      EventBus.emit("theme:toggle", config.theme);

      const defaultDirInput = document.getElementById("default-dir");
      const chooseDirBtn = document.getElementById("choose-dir");

      defaultDirInput.value = config.storage_location || "./markdowns";

      chooseDirBtn.onclick = async () => {
        const selected = await window.api.dialog.chooseDirectory();
        if (selected) {
          const appRoot = (await window.api.system.getAppRoot?.()) || ".";
          const relativePath = formatAsRelativePath(selected, appRoot);

          defaultDirInput.value = relativePath;

          await window.api.config.updateUserConfig({
            storage_location: relativePath,
          });

          EventBus.emit(
            "status:update",
            `Updated default markdown dir: ${relativePath}`
          );
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

export function setupRenderModal() {
  return setupModal("render-modal", {
    closeBtn: "render-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "40em",
    height: "40vh",
    onOpen: () => {
      const modal = document.getElementById("render-modal");
      if (modal) modal.classList.add("large");
    },
  });
}

export function setupFieldEditModal(onConfirm) {
  const modal = setupModal("field-edit-modal", {
    closeBtn: "field-edit-close",
    escToClose: true,
    backdropClick: true,
    width: "40em",
    height: "auto",
  });

  const typeOptions = Object.entries(fieldTypes).map(([key, def]) => ({
    value: key,
    label: def.label,
  }));

  const markdownOptions = Array.from(
    new Set(
      Object.values(fieldTypes).map((def) => def.defaultMarkdownHint || "")
    )
  )
    .filter(Boolean)
    .sort()
    .map((tag) => ({ value: tag, label: tag.toUpperCase() }));

  const typeDropdown = createDropdown({
    containerId: "edit-type-container",
    labelText: "Type",
    options: typeOptions,
    selectedValue: "text",
    onChange: (val) => {
      const modalEl = document.getElementById("field-edit-modal");
      if (!modalEl) return;
      applyModalCssClass(modalEl, fieldTypes[val]);
    },
  });

  const markdownDropdown = createDropdown({
    containerId: "edit-markdown-container",
    labelText: "Markdown",
    options: [{ value: "", label: "None" }, ...markdownOptions],
    selectedValue: "",
  });

  const confirmBtn = document.getElementById("field-edit-confirm");
  confirmBtn.onclick = () => {
    const field = extractFieldDefinition({
      typeDropdown,
      markdownDropdown,
    });

    onConfirm(field);
    modal.hide();
  };

  return {
    modal,
    show: modal.show,
    hide: modal.hide,
    typeDropdown,
    markdownDropdown,
  };
}
