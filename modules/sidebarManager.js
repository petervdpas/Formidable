// /modules/sidebarManager.js

import { createListManager } from "./listManager.js";
import { EventBus } from "./eventBus.js";
import { stripMetaExtension } from "../utils/pathUtils.js";
import { highlightAndClickMatch } from "../utils/domUtils.js";
import {
  handleTemplateClick,
  handleTemplateConfirm,
  handleEntryClick,
  handleEntryConfirm,
} from "./handlers.js";

// ─── Public Init Functions ───
export function createTemplateListManager(
  yamlEditor,
  modal,
  defaultStorageLocation = "./storage",
  dropdown = null
) {
  const listManager = createListManager({
    elementId: "template-list",
    fetchListFunction: async () => await window.api.templates.listTemplates(),
    onItemClick: (itemName) => handleTemplateClick(itemName, yamlEditor),
    emptyMessage: "No template files found.",
    addButton: {
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

              yamlEditor.render(yaml);

              EventBus.emit("template:selected", { name: template, yaml });
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
    },
  });

  EventBus.on("template:list:reload", async () => {
    await listManager.loadList();
  });

  EventBus.on("template:list:highlighted", (name) => {
    if (!name) return;
    const container = document.getElementById("template-list");
    highlightAndClickMatch(container, name);
  });

  return listManager;
}

export function createMetaListManager(formManager, modal) {
  const listManager = createListManager({
    elementId: "storage-list",
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
    onItemClick: (entryName) => handleEntryClick(entryName, formManager),
    emptyMessage: "No metadata files found.",
    addButton: {
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
    },
  });

  EventBus.on("meta:list:reload", async () => {
    await listManager.loadList();
  });

  EventBus.on("form:list:highlighted", (name) => {
    if (!name) return;
    const container = document.getElementById("storage-list");
    highlightAndClickMatch(container, name);
  });

  return listManager;
}
