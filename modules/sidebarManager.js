// /modules/sidebarManager.js

import { EventBus } from "./eventBus.js";
import { ensureVirtualLocation } from "../utils/vfsUtils.js";
import { stripMetaExtension } from "../utils/pathUtils.js";
import { buildSwitchElement } from "../utils/elementBuilders.js";
import { createListManager } from "./listManager.js";
import { createAddButton } from "./uiButtons.js";

export function createTemplateListManager(modal, dropdown = null) {
  const listManager = createListManager({
    elementId: "template-list",
    itemClass: "template-item",

    // 🔁 Use EventBus for fetching templates
    fetchListFunction: async () => {
      return await new Promise((resolve) => {
        EventBus.emit("template:list", { callback: resolve });
      });
    },

    onItemClick: (templateItem) =>
      EventBus.emit("template:list:itemClicked", templateItem),

    emptyMessage: "No template files found.",

    addButton: createAddButton({
      label: "+ Add Template",
      onClick: async () => {
        EventBus.emit("modal:template:confirm", {
          modal,
          callback: async ({ template, yaml }) => {
            try {
              // Save template via EventBus
              const success = await new Promise((resolve) => {
                EventBus.emit("template:save", {
                  name: template,
                  data: yaml,
                  callback: resolve,
                });
              });

              if (!success) throw new Error("Save failed");

              await listManager.loadList();

              if (dropdown?.refresh) await dropdown.refresh();

              EventBus.emit("template:selected", {
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
  const { input: toggle, element: wrapper } = buildSwitchElement({
    id: "flagged-toggle",
    checked: false,
    trailingLabel: ["Show only flagged", "Show all"],
    onFlip: (value) => {
      showOnlyFlagged = value;

      new Promise((resolve) =>
        EventBus.emit("config:load", (cfg) => resolve(cfg))
      ).then((cfg) => {
        const name = window.currentSelectedDataFile || cfg?.selected_data_file;

        listManager.renderList(undefined, () => {
          if (name) {
            EventBus.emit("form:list:highlighted", name);
          }
        });
      });
    },
  });

  let showOnlyFlagged = false;

  const listManager = createListManager({
    elementId: "storage-list",
    itemClass: "storage-item",
    fetchListFunction: async () => {
      const template = await ensureVirtualLocation(
        window.currentSelectedTemplate
      );
      if (!template || !template.virtualLocation) return [];

      await window.api.forms.ensureFormDir(template.filename);
      const files = await window.api.forms.listForms(template.filename);

      return Promise.all(
        files.map(async (fullName) => {
          const meta = await window.api.forms.loadForm(
            template.filename,
            fullName
          );
          return {
            display: stripMetaExtension(fullName),
            value: fullName,
            flagged: meta?.meta?.flagged || false,
          };
        })
      );
    },
    onItemClick: (storageItem) =>
      EventBus.emit("form:list:itemClicked", storageItem),
    emptyMessage: "No metadata files found.",
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
    filterFunction: (item) => !showOnlyFlagged || item.flagged,
    filterUI: wrapper,
    addButton: createAddButton({
      label: "+ Add Entry",
      onClick: async () => {
        const template = window.currentSelectedTemplate;
        if (!template) {
          EventBus.emit("status:update", "Please select a template first.");
          return;
        }

        EventBus.emit("modal:entry:confirm", {
          modal,
          callback: async (datafile) => {
            await formManager.loadFormData({}, datafile);
            EventBus.emit("status:update", "New metadata entry ready.");
          },
        });
      },
    }),
  });

  toggle.addEventListener("change", async () => {
    showOnlyFlagged = toggle.checked;

    const config = await new Promise((resolve) => {
      EventBus.emit("config:load", (cfg) => resolve(cfg));
    });
    const name = window.currentSelectedDataFile || config?.selected_data_file;

    listManager.renderList(undefined, () => {
      if (name) {
        EventBus.emit("form:list:highlighted", name);
      }
    });
  });

  return {
    ...listManager,
    reloadList: () => listManager.loadList(),
  };
}
