// modules/modalSetup.js

import { setupModal } from "./modalManager.js";
import { EventBus } from "./eventBus.js";
import { fieldTypes } from "../utils/fieldTypes.js";
import { renderSettings, getCachedConfig } from "./settingsManager.js";
import { renderWorkspaceModal } from "./contextManager.js";
import { applyModalCssClass } from "../utils/modalUtils.js";
import { extractFieldDefinition } from "../utils/formUtils.js";
import { createDropdown } from "./dropdownManager.js";
import { syncScroll } from "../utils/domUtils.js";
import { createProfileListManager } from "./profileManager.js";
import { renderPluginManager } from "./pluginManagerUI.js";
import { renderGitStatus } from "./gitActions.js";
import {
  createModalConfirmButton,
  createModalCancelButton,
  createShowMarkdownButton,
  createShowPreviewButton,
  createPaneCloseButton,
  createPluginReloadButton,
  createPluginCreateButton,
  buildButtonGroup,
} from "./uiButtons.js";

export function setupProfileModal() {
  return setupModal("profile-modal", {
    closeBtn: "profile-close",
    escToClose: true,
    backdropClick: true,
    width: "30em",
    height: "auto",
    onOpen: async () => {
      const container = document.getElementById("profile-body");
      if (!container) return;

      container.innerHTML = `<div id="profile-list"></div>`;

      const manager = createProfileListManager();
      await manager.reloadList();

      const currentProfile = await new Promise((resolve) => {
        EventBus.emit("config:profile:current", { callback: resolve });
      });

      console.log(
        `[ProfileModal] Current profile: ${currentProfile || "None"}`
      );
      if (currentProfile) {
        EventBus.emit("profile:list:highlighted", {
          listId: "profile-list",
          name: currentProfile,
        });
      }

      container.appendChild(manager.addNewRow);
    },
  });
}

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

export function setupWorkspaceModal() {
  return setupModal("workspace-modal", {
    closeBtn: "workspace-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "30em",
    height: "auto",
    onOpen: async () => {
      const ok = await renderWorkspaceModal();
      if (!ok) {
        EventBus.emit("logging:warning", ["Workspace container not found"]);
      }
    },
  });
}

export function setupGitModal() {
  return setupModal("git-actions-modal", {
    closeBtn: "git-actions-close",
    escToClose: true,
    backdropClick: true,
    width: "40em",
    height: "auto",
    onOpen: async () => {
      const container = document.getElementById("git-modal-body");
      if (container) await renderGitStatus(container);
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
      const input = modal?.querySelector("input#context-folder");
      if (!input) return;

      const config =
        getCachedConfig() ||
        (await new Promise((resolve) => {
          EventBus.emit("config:load", (cfg) => resolve(cfg));
        }));
      input.value = config.context_folder || "./";
    },
  });
}

export function setupPluginModal() {
  return setupModal("plugin-manager-modal", {
    closeBtn: "plugin-manager-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "40em",
    height: "70vh",

    onOpen: async () => {
      const container = document.getElementById("plugin-manager-body");
      if (!container) {
        console.warn("[PluginModal] Missing container #plugin-manager-body");
        return;
      }

      try {
        container.innerHTML = "";

        // ─── Plugin List ───────────────────────────────
        const listWrapper = document.createElement("div");
        listWrapper.id = "plugin-list";
        container.appendChild(listWrapper);

        const listManager = await renderPluginManager(container);

        // ─── Reload Button ──────────────────────────────
        const reloadBtn = createPluginReloadButton(() => {
          EventBus.emitWithResponse("plugin:reload", null).then(() => {
            listManager.loadList();
          });
        });
        container.insertBefore(reloadBtn, listWrapper);

        // ─── Create Plugin Section ─────────────────────
        const uploadWrapper = document.createElement("div");
        uploadWrapper.className = "plugin-upload-section";

        const header = document.createElement("h3");
        header.textContent = "Create New Plugin";
        uploadWrapper.appendChild(header);

        const folderInput = document.createElement("input");
        folderInput.type = "text";
        folderInput.placeholder = "New plugin folder name";
        folderInput.className = "plugin-upload-folder";
        uploadWrapper.appendChild(folderInput);

        const createBtn = createPluginCreateButton(() => {
          const folder = folderInput.value.trim();
          if (!folder) {
            EventBus.emit("ui:toast", {
              message: "Folder name is required.",
              variant: "error",
            });
            return;
          }

          EventBus.emitWithResponse("plugin:create", { folder }).then(
            (result) => {
              EventBus.emit("ui:toast", {
                message: result.message || result.error || "Plugin created.",
                variant: result.error ? "error" : "success",
              });
              listManager.loadList();
              folderInput.value = "";
            }
          );
        });

        uploadWrapper.appendChild(createBtn);
        container.appendChild(uploadWrapper);
      } catch (err) {
        console.error("[PluginModal] Failed to render plugin manager:", err);
        container.innerHTML = `<p class="error">Failed to load plugin manager.</p>`;
      }
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

      const rawPane = document.querySelector(".raw-pane");
      const htmlPane = document.querySelector(".html-pane");

      const rawHeader = rawPane?.querySelector(".pane-header");
      const htmlHeader = htmlPane?.querySelector(".pane-header");
      const titleRow = modal?.querySelector(".modal-title-row");

      const showRawBtn = createShowMarkdownButton(() => {
        rawPane.style.display = "flex";
        rawPane.style.flex = "1 1 0";
        htmlPane.style.flex = "1 1 0";
        showRawBtn.style.display = "none";
      });

      const showHtmlBtn = createShowPreviewButton(() => {
        htmlPane.style.display = "flex";
        htmlPane.style.flex = "1 1 0";
        rawPane.style.flex = "1 1 0";
        showHtmlBtn.style.display = "none";
      });

      // Inject toggle buttons into title row
      if (titleRow && !titleRow.querySelector("#btn-show-markdown")) {
        const toggleGroup = buildButtonGroup(showRawBtn, showHtmlBtn);
        toggleGroup.style.marginLeft = "auto";
        toggleGroup.style.display = "flex";
        toggleGroup.style.gap = "6px";
        titleRow.appendChild(toggleGroup);
      }

      // Set initial visibility
      const rawHidden = window.getComputedStyle(rawPane).display === "none";
      const htmlHidden = window.getComputedStyle(htmlPane).display === "none";

      showRawBtn.style.display = rawHidden ? "inline-block" : "none";
      showHtmlBtn.style.display = htmlHidden ? "inline-block" : "none";

      // Close buttons for individual panes
      if (rawHeader && !rawHeader.querySelector(".btn-close-special")) {
        rawHeader.appendChild(
          createPaneCloseButton("raw-pane", () => {
            rawPane.style.display = "none";
            htmlPane.style.flex = "1 1 auto";
            showRawBtn.style.display = "inline-block";
          })
        );
      }

      if (htmlHeader && !htmlHeader.querySelector(".btn-close-special")) {
        htmlHeader.appendChild(
          createPaneCloseButton("html-pane", () => {
            htmlPane.style.display = "none";
            rawPane.style.flex = "1 1 auto";
            showHtmlBtn.style.display = "inline-block";
          })
        );
      }

      // Enable scroll sync
      const output = document.getElementById("render-output");
      const preview = document.getElementById("render-preview");

      if (output && preview) {
        syncScroll(output, preview);
      }
    },
  });
}

export function setupFieldEditModal(onConfirm) {
  const modal = setupModal("field-edit-modal", {
    closeBtn: "field-edit-close",
    escToClose: true,
    backdropClick: true,
    width: "44em",
    height: "auto",
  });

  const typeOptions = Object.entries(fieldTypes).map(([key, def]) => ({
    value: key,
    label: def.label,
    disabled: def.metaOnly && key !== "looper",
  }));

  // Sort: Looper first
  typeOptions.sort((a, b) => (a.value === "looper" ? -1 : 1));

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

  messageEl.innerHTML = message;

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
