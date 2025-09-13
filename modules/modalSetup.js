// modules/modalSetup.js

import { EventBus } from "./eventBus.js";
import { reloadUserConfig } from "../utils/configUtil.js";
import { buildButtonGroup, createButton } from "../utils/buttonUtils.js";
import { fieldTypes } from "../utils/fieldTypes.js";
import { renderSettings } from "./settingsManager.js";
import { renderWorkspaceModal } from "./contextManager.js";
import { applyModalCssClass, setupModal } from "../utils/modalUtils.js";
import { extractFieldDefinition } from "../utils/formUtils.js";
import { createDropdown } from "../utils/dropdownUtils.js";
import { syncScroll } from "../utils/domUtils.js";
import { createProfileListManager } from "./profileManager.js";
import { renderPluginManager } from "./pluginManagerUI.js";
import { renderHelp } from "./helperUI.js";
import { renderGitStatus } from "./gitActions.js";
import {
  createSettingsRestartIconButton,
  createShowMarkdownButton,
  createShowPreviewButton,
  createPaneCloseButton,
  createPluginReloadButton,
  createPluginCreateButton,
} from "./uiButtons.js";
import { t } from "../utils/i18n.js";

export function setupProfileModal() {
  return setupModal("profile-modal", {
    closeBtn: "profile-close",
    escToClose: true,
    backdropClick: true,
    width: "36em",
    height: "auto",
    onOpen: async () => {
      const container = document.getElementById("profile-body");
      if (!container) return;

      container.innerHTML = `<div id="profile-list"></div>`;

      const currentProfile = await new Promise((resolve) => {
        EventBus.emit("config:profile:current", { callback: resolve });
      });

      const manager = createProfileListManager({ currentProfile });
      await manager.reloadList();

      EventBus.emit("logging:default", [
        `[ProfileModal] Current profile: ${currentProfile || "None"}`,
      ]);
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
  function refreshProfileBadge() {
    const el = document.getElementById("current-profile");
    if (!el) return;

    EventBus.emit("config:profile:current", {
      callback: (filename) => {
        const label = filename || "user.json";
        el.textContent = label;
        el.title = label;
      },
    });
  }

  const modal = setupModal("settings-modal", {
    closeBtn: "settings-close",
    escToClose: true,
    backdropClick: true,
    resizable: false,
    width: "40em",
    height: "22em",

    onOpen: async (_el, api) => {
      // disable while initializing
      api.setDisabled();
      try {
        const injectButton = document.getElementById("settings-inject-button");
        if (injectButton) {
          injectButton.innerHTML = "";
          const btn = createSettingsRestartIconButton(async () => {
            // prevent double-presses during confirm
            api.setDisabled();
            try {
              const confirmed = await showConfirmModal(
                "special.system.restart.sure",
                null,
                {
                  okKey: "standard.yes",
                  cancelKey: "standard.no",
                  width: "auto",
                  height: "auto",
                }
              );
              if (!confirmed) return;

              location.reload();
            } finally {
              // only re-enable if we did NOT reload
              if (!document.hidden) api.setEnabled();
            }
          });
          injectButton.appendChild(btn);
        }

        refreshProfileBadge();

        const ok = await renderSettings();
        if (!ok) {
          EventBus.emit("logging:warning", ["Settings container not found"]);
        }
      } finally {
        api.setEnabled();
      }
    },
  });

  return modal;
}

export function setuHelpModal() {
  return setupModal("help-modal", {
    closeBtn: "help-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "60em",
    height: "auto",
    maxHeight: "80vh",
    onOpen: async () => {
      const ok = await renderHelp();
      if (!ok) EventBus.emit("logging:warning", ["Help container not found"]);
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
  const modal = setupModal("git-actions-modal", {
    closeBtn: "git-actions-close",
    escToClose: true,
    backdropClick: true,
    width: "40em",
    height: "auto",
    onOpen: async () => {
      const container = document.getElementById("git-modal-body");
      if (container) await renderGitStatus(container, modal);
    },
  });

  return modal;
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
      const config = await reloadUserConfig();
      input.value = config.context_folder || "./";
    },
  });
}

export function setupPluginModal() {
  const modal = setupModal("plugin-manager-modal", {
    closeBtn: "plugin-manager-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "40em",
    height: "auto",

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

        // Pass the modal API we just created
        const listManager = await renderPluginManager(container, modal);

        // ─── Reload Button ──────────────────────────────
        const reloadBtn = createPluginReloadButton(async () => {
          modal.setDisabled();
          try {
            await EventBus.emitWithResponse("plugin:reload", null);
            await listManager.loadList();
          } finally {
            modal.setEnabled();
          }
        });
        container.insertBefore(reloadBtn, listWrapper);

        // ─── Create Plugin Section ─────────────────────
        const uploadWrapper = document.createElement("div");
        uploadWrapper.className = "plugin-upload-section";

        const header = document.createElement("h3");
        header.textContent = "Create New Plugin";
        uploadWrapper.appendChild(header);

        const row = document.createElement("div");
        row.className = "plugin-create-row";

        const folderInput = document.createElement("input");
        folderInput.type = "text";
        folderInput.placeholder = "New plugin folder name";
        folderInput.className = "plugin-upload-folder";
        row.appendChild(folderInput);

        const dropdownContainer = document.createElement("div");
        dropdownContainer.id = "plugin-target-dropdown";
        dropdownContainer.style.flex = "1";
        row.appendChild(dropdownContainer);

        let selectedTarget = "frontend";

        const createBtn = createPluginCreateButton(async () => {
          const folder = folderInput.value.trim();
          if (!folder) {
            EventBus.emit("ui:toast", {
              languageKey: "toast.folder.required",
              variant: "error",
            });
            return;
          }

          modal.setDisabled();
          try {
            const result = await EventBus.emitWithResponse("plugin:create", {
              folder,
              target: selectedTarget,
            });

            EventBus.emit("ui:toast", {
              message:
                result.message || result.error || t("toast.plugin.created"),
              variant: result.error ? "error" : "success",
            });

            await listManager.loadList();
            folderInput.value = "";
          } finally {
            modal.setEnabled();
          }
        });
        row.appendChild(createBtn);

        uploadWrapper.appendChild(row);
        container.appendChild(uploadWrapper);

        // Target dropdown
        createDropdown({
          containerId: "plugin-target-dropdown",
          labelTextOrKey: "",
          selectedValue: selectedTarget,
          options: [
            { value: "frontend", label: "Frontend" },
            { value: "backend", label: "Backend" },
          ],
          onChange: (val) => {
            selectedTarget = val;
          },
        });
      } catch (err) {
        container.innerHTML = `<p class="error">Failed to load plugin manager.</p>`;
      }
    },
  });

  return modal;
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

export function setupFieldEditModal(field, allFields, onConfirm) {
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

  // Create the type dropdown
  const typeDropdown = createDropdown({
    containerId: "edit-type-container",
    labelTextOrKey: "field.type",
    options: typeOptions,
    selectedValue: "text",
    onChange: (val) => {
      const modalEl = document.getElementById("field-edit-modal");
      if (!modalEl) return;
      applyModalCssClass(modalEl, fieldTypes[val]);
    },
    i18nEnabled: true,
  });

  // Collect dropdown options from all non-loop fields
  const summaryOptions = allFields
    .filter((f) => f.type !== "loopstart" && f.type !== "loopstop")
    .map((f) => ({
      value: f.key,
      label: `${f.label || f.key} (${f.key})`,
    }));

  summaryOptions.unshift({ value: "", label: "(none)" });

  // Create the summary field dropdown
  const summaryFieldDropdown = createDropdown({
    containerId: "edit-summary-field-container",
    labelTextOrKey: "field.summary",
    options: summaryOptions,
    selectedValue: field.summary_field || "",
    onChange: (val) => {
      validate(); // optional
    },
    i18nEnabled: true,
  });

  const confirmBtn = createButton({
    id: "field-edit-confirm",
    text: t("standard.confirm"),
    onClick: () => {
      const keyInput = document.getElementById("edit-key");
      const rawKey = keyInput?.value.trim();

      if (!rawKey) {
        keyInput.classList.add("input-error");
        confirmBtn.disabled = true;
        EventBus.emit("ui:toast", {
          languageKey: "toast.key.required",
          variant: "error",
        });
        return;
      }

      try {
        const field = extractFieldDefinition({
          typeDropdown: typeDropdown,
          summaryDropdown: summaryFieldDropdown,
        });
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
