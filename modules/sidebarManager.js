// /modules/sidebarManager.js

import { createListManager } from "./listManager.js";
import { EventBus } from "./eventBus.js";
import { stripMetaExtension } from "../utils/pathUtils.js";
import { getCompactDate } from "../utils/dateUtils.js";
import { sanitize } from "../utils/stringUtils.js";
import {
  createModalConfirmButton,
  createModalCancelButton,
  buildButtonGroup,
  createAddButton,
} from "./uiButtons.js";

function injectWrapperButtons(wrapperId, confirmBtn, cancelBtn) {
  const wrapper = document.getElementById(wrapperId);
  wrapper.innerHTML = "";
  wrapper.appendChild(buildButtonGroup(confirmBtn, cancelBtn));
}

function handleTemplateConfirm(modal, defaultStorageLocation, callback) {
  const nameInput = document.getElementById("template-name");
  const dirInput = document.getElementById("template-dir");

  nameInput.value = "";
  dirInput.value = defaultStorageLocation;

  // ─── Sync dir input based on filename ───
  function updateDirValue() {
    const raw = nameInput.value.trim();
    const safeName = sanitize(nameInput.value);
    dirInput.value = safeName
      ? `${defaultStorageLocation}/${safeName}`
      : "./storage";
  }

  nameInput.removeEventListener("input", updateDirValue);
  nameInput.addEventListener("input", updateDirValue);

  // ─── Dynamisch confirm button bouwen ───
  const confirmBtn = createModalConfirmButton({
    id: "template-confirm",
    text: "Create",
    onClick: async () => {
      const raw = nameInput.value.trim();
      if (!raw) return;

      const safeName = sanitize(raw);
      const template = `${safeName}.yaml`;
      const storage_location = dirInput.value.trim() || "markdown";

      modal.hide();

      callback({
        template,
        yaml: {
          name: safeName,
          storage_location,
          markdown_template: "",
          fields: [],
        },
      });
    },
  });

  // ─── Optioneel: ook X-button dynamisch maken ───
  const cancelBtn = createModalCancelButton({
    id: "template-cancel",
    onClick: () => modal.hide(),
  });

  injectWrapperButtons("template-modal-buttons-wrapper", confirmBtn, cancelBtn);

  modal.show();
  setTimeout(() => nameInput.focus(), 100);
}

function handleEntryConfirm(modal, callback) {
  const input = document.getElementById("entry-name");
  const checkbox = document.getElementById("entry-append-date");

  input.value = "";
  checkbox.checked = true;

  const confirmBtn = createModalConfirmButton({
    id: "entry-confirm",
    text: "Confirm",
    className: "btn-okay", // optioneel voor groene knop
    onClick: () => {
      const raw = input.value.trim();
      if (!raw) return;

      const sanitized = sanitize(raw).toLowerCase();
      const appendDate = checkbox.checked;

      let finalName = sanitized;
      if (appendDate) {
        finalName = `${sanitized}-${getCompactDate()}`;
      }

      modal.hide();
      callback(finalName);
    },
  });

  const cancelBtn = createModalCancelButton({
    id: "entry-cancel",
    onClick: () => modal.hide(),
  });

  injectWrapperButtons("entry-modal-buttons-wrapper", confirmBtn, cancelBtn);

  modal.show();
  setTimeout(() => input.focus(), 100);
}

// ─── Public Init Functions ───
export function createTemplateListManager(
  modal,
  defaultStorageLocation = "./storage",
  dropdown = null
) {
  const listManager = createListManager({
    elementId: "template-list",
    itemClass: "template-item",
    fetchListFunction: async () => await window.api.templates.listTemplates(),
    onItemClick: (templateItem) =>
      EventBus.emit("template:list:itemClicked", templateItem),
    emptyMessage: "No template files found.",
    addButton: createAddButton({
      label: "+ Add Template",
      onClick: async () => {
        handleTemplateConfirm(
          modal,
          defaultStorageLocation,
          async ({ template, yaml }) => {
            try {
              await window.api.templates.saveTemplate(template, yaml);
              await listManager.loadList();

              if (dropdown?.refresh) {
                await dropdown.refresh();
              }

              EventBus.emit("context:select:template", {
                name: template,
                yaml,
              });
              EventBus.emit(
                "status:update",
                `Created new template: ${template}`
              );
            } catch (err) {
              EventBus.emit("logging:error", [
                "[AddTemplate] Failed to save:",
                err,
              ]);
              EventBus.emit("status:update", "Error creating new template.");
            }
          }
        );
      },
    }),
  });

  return {
    ...listManager,
    reloadList: () => listManager.loadList(),
  };
}

export function createStorageListManager(formManager, modal) {
  const listManager = createListManager({
    elementId: "storage-list",
    itemClass: "storage-item",
    fetchListFunction: async () => {
      const template = window.currentSelectedTemplate;
      if (!template) {
        EventBus.emit("logging:warning", ["[MetaList] No selected template."]);
        EventBus.emit("status:update", "No template selected.");
        return [];
      }

      if (!template.storage_location) {
        EventBus.emit("logging:warning", [
          "[MetaList] No storage location field.",
        ]);
        EventBus.emit(
          "status:update",
          "Template missing storage location field."
        );
        return [];
      }

      await window.api.forms.ensureFormDir(template.storage_location);
      const files = await window.api.forms.listForms(template.storage_location);
      return files.map((fullName) => ({
        display: stripMetaExtension(fullName),
        value: fullName,
      }));
    },
    onItemClick: (storageItem) =>
      EventBus.emit("form:list:itemClicked", storageItem),
    emptyMessage: "No metadata files found.",
    addButton: createAddButton({
      label: "+ Add Entry",
      onClick: async () => {
        const template = window.currentSelectedTemplate;
        if (!template) {
          EventBus.emit("logging:warning", [
            "[AddMarkdown] No template selected.",
          ]);
          EventBus.emit("status:update", "Please select a template first.");
          return;
        }

        handleEntryConfirm(modal, async (datafile) => {
          EventBus.emit("logging:default", [
            "[AddMarkdown] Creating new entry:",
            datafile,
          ]);
          await formManager.loadFormData({}, datafile);
          EventBus.emit("status:update", "New metadata entry ready.");
        });
      },
    }),
  });

  return {
    ...listManager,
    reloadList: () => listManager.loadList(),
  };
}
