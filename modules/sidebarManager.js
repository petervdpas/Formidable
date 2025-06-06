// /modules/sidebarManager.js

import { createListManager } from "./listManager.js";
import { EventBus } from "./eventBus.js";
import { stripMetaExtension } from "../utils/pathUtils.js";
import { createAddButton } from "./uiButtons.js";

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
        EventBus.emit("modal:template:confirm", {
          modal,
          defaultStorageLocation,
          callback: async ({ template, yaml }) => {
            try {
              await window.api.templates.saveTemplate(template, yaml);
              await listManager.loadList();

              if (dropdown?.refresh) await dropdown.refresh();

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
          },
        });
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

      const items = [];
      for (const fullName of files) {
        const meta = await window.api.forms.loadForm(
          template.storage_location,
          fullName
        );
        items.push({
          display: stripMetaExtension(fullName),
          value: fullName,
          flagged: meta?.meta?.flagged || false,
        });
      }

      return items;
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

        EventBus.emit("modal:entry:confirm", {
          modal,
          callback: async (datafile) => {
            EventBus.emit("logging:default", [
              "[AddMarkdown] Creating new entry:",
              datafile,
            ]);
            await formManager.loadFormData({}, datafile);
            EventBus.emit("status:update", "New metadata entry ready.");
          },
        });
      },
    }),
    renderItemExtra: (item, raw) => {
      if (raw.flagged) {
        const wrapper = document.createElement("span");
        wrapper.className = "flag-icon-wrapper";

        const flagIcon = document.createElement("i");
        flagIcon.className = "fa fa-flag";
        flagIcon.style.pointerEvents = "none";

        wrapper.appendChild(flagIcon);
        item.appendChild(wrapper);
      }
    },
  });

  return {
    ...listManager,
    reloadList: () => listManager.loadList(),
  };
}
