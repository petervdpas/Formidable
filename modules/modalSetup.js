// modules/modalSetup.js

import { setupModal } from "./modalManager.js";
import { EventBus } from "./eventBus.js";
import { fieldTypes } from "../utils/fieldTypes.js";
import { renderSettings, getCachedConfig } from "./settingsManager.js";
import { applyModalCssClass } from "../utils/modalUtils.js";
import { extractFieldDefinition } from "../utils/formUtils.js";
import { createDropdown } from "./dropdownManager.js";
import { syncScroll } from "../utils/domUtils.js";
import {
  createModalConfirmButton,
  createModalCancelButton,
  buildButtonGroup,
} from "./uiButtons.js";

export function setupSettingsModal() {
  return setupModal("settings-modal", {
    closeBtn: "settings-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "30em",
    height: "auto",
    onOpen: async () => {
      const ok = await renderSettings();
      if (!ok)
        EventBus.emit("logging:warning", ["Settings container not found"]);
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
    onOpen: async () => {
      const modal = document.getElementById("template-modal");
      const input = modal?.querySelector("input#template-dir");
      if (!input) return;

      const config =
        getCachedConfig() || (await window.api.config.loadUserConfig());
      input.value = config.storage_location || "./storage";
    },
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

      const rawPane = document.getElementById("render-output");
      const htmlPane = document.getElementById("render-preview");

      if (rawPane && htmlPane) {
        syncScroll(rawPane, htmlPane);
      }
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

  const confirmBtn = createModalConfirmButton({
    id: "field-edit-confirm",
    text: "Confirm",
    onClick: () => {
      const keyInput = document.getElementById("edit-key");
      const rawKey = keyInput?.value.trim();

      if (!rawKey) {
        keyInput.classList.add("input-error");
        confirmBtn.disabled = true;
        EventBus.emit("ui:toast", {
          message: "Key cannot be empty.",
          variant: "error",
        });
        return;
      }

      try {
        const field = extractFieldDefinition({ typeDropdown });
        onConfirm(field);
        modal.hide();
      } catch (err) {
        const optField = document.getElementById("edit-options");
        if (optField) {
          optField.style.border = "1px solid red";
          optField.title = "Invalid JSON: " + err.message;
        }
        EventBus.emit("logging:warning", [
          "Invalid JSON in Options field",
          err,
        ]);
      }
    },
  });

  const wrapper = document.getElementById("field-edit-buttons-wrapper");
  if (wrapper) {
    wrapper.innerHTML = ""; // clean slate
    wrapper.appendChild(buildButtonGroup(confirmBtn));
  }

  return {
    modal,
    show: modal.show,
    hide: modal.hide,
    typeDropdown,
  };
}

export function showConfirmModal(message, { ...options } = {}) {
  const modal = setupModal("confirm-modal", {
    escToClose: true,
    backdropClick: true,
    width: "30em",
    height: "auto",
    resizable: false,
    ...options,
  });

  const messageEl = document.getElementById("confirm-message");
  const buttonWrapper = document.getElementById("confirm-buttons-wrapper");

  messageEl.textContent = message;

  return new Promise((resolve) => {
    const okBtn = createModalConfirmButton({
      text: options.okText || "OK",
      onClick: () => {
        modal.hide();
        resolve(true);
      },
    });

    const cancelBtn = createModalCancelButton({
      text: options.cancelText || "Cancel",
      onClick: () => {
        modal.hide();
        resolve(false);
      },
    });

    buttonWrapper.innerHTML = "";
    buttonWrapper.appendChild(buildButtonGroup(okBtn, cancelBtn));
    modal.show();
  });
}
