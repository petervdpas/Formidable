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

      await EventBus.emitWithResponse("form:ensureDir", template.filename);

      const descriptor = await new Promise((resolve) => {
        EventBus.emit("template:descriptor", {
          name: template.filename,
          callback: resolve,
        });
      });

      const sidebarExpr = descriptor?.yaml?.sidebar_handling || null;

      const entries = await new Promise((resolve) => {
        EventBus.emit("form:extendedList", {
          templateFilename: template.filename,
          callback: resolve,
        });
      });

      return entries.map((entry) => {
        return {
          display: stripMetaExtension(entry.filename),
          value: entry.filename,
          flagged: entry.meta?.flagged || false,
          id: entry.meta?.id || "",
          sidebarContext: entry.sidebarItems || {},
          sidebarExpr: sidebarExpr,
        };
      });
    },
    onItemClick: (storageItem) =>
      EventBus.emit("form:list:itemClicked", storageItem),
    emptyMessage: "No metadata files found.",
    renderItemExtra: async ({ subLabelNode, flagNode, rawData }) => {
      // Flag (with wrapper so CSS matches)
      if (rawData.flagged) {
        const wrapper = document.createElement("span");
        wrapper.className = "flag-icon-wrapper";

        const flagIcon = document.createElement("i");
        flagIcon.className = "fa fa-flag";
        flagIcon.style.pointerEvents = "none";

        wrapper.appendChild(flagIcon);
        flagNode.appendChild(wrapper);
      }

      /*
      if (rawData.sidebarExpr && rawData.sidebarContext) {
        const parsed = await EventBus.emitWithResponse(
          "transform:parseMiniExpr",
          {
            expr: rawData.sidebarExpr,
            context: rawData.sidebarContext,
          }
        );

        if (parsed?.text) {
          subLabelNode.textContent = parsed.text;
        } else if (rawData.id) {
          subLabelNode.textContent = rawData.id;
        }

        if (parsed?.color) {
          subLabelNode.style.color = parsed.color;
        }
      } else if (rawData.id) {
        subLabelNode.textContent = rawData.id;
      }
      */
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
