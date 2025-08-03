// /modules/sidebarManager.js

import { EventBus } from "./eventBus.js";
import { ensureVirtualLocation } from "../utils/vfsUtils.js";
import { getUserConfig } from "../utils/configUtil.js";
import { evaluateExpression } from "../utils/transformationUtils.js";
import { stripMetaExtension } from "../utils/pathUtils.js";
import {
  buildSwitchElement,
  buildExpressionLabel,
} from "../utils/elementBuilders.js";
import { createListManager } from "../utils/listUtils.js";
import { createAddButton } from "./uiButtons.js";
import { t } from "../utils/i18n.js";

export function createTemplateListManager(modal, dropdown = null) {
  const listManager = createListManager({
    elementId: "template-list",
    itemClass: "template-item",

    fetchListFunction: async () => {
      return await new Promise((resolve) => {
        EventBus.emit("template:list", { callback: resolve });
      });
    },

    onItemClick: (templateItem) =>
      EventBus.emit("template:list:itemClicked", templateItem),

    emptyMessage: t("special.noTemplatesFound"),

    addButton: createAddButton({
      label: t("button.addTemplate"),
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

              if (!success) {
                throw new Error("Save failed");
              }

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
  let showOnlyFlagged = false;
  let listManager = null;

  // MOVE toggle creation ABOVE listManager so `wrapper` exists
  const { input: toggle, element: wrapper } = buildSwitchElement({
    id: "flagged-toggle",
    checked: false,
    trailingLabel: [t("special.showFlagged"), t("special.showAll")],
    onFlip: async (value) => {
      showOnlyFlagged = value;

      const selected_datafile = await getUserConfig("selected_data_file");
      const name = window.currentSelectedDataFile || selected_datafile;

      listManager.renderList(undefined, () => {
        if (name) {
          EventBus.emit("form:list:highlighted", name);
        }
      });
    },
  });

  listManager = createListManager({
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
          sidebarContext: entry.expressionItems || {},
          sidebarExpr: sidebarExpr,
        };
      });
    },

    onItemClick: (storageItem) =>
      EventBus.emit("form:list:itemClicked", storageItem),

    emptyMessage: t("special.noMetadataFilesFound"),

    renderItemExtra: async ({ subLabelNode, flagNode, rawData }) => {
      if (rawData.flagged) {
        const wrapper = document.createElement("span");
        wrapper.className = "flag-icon-wrapper";
        const flagIcon = document.createElement("i");
        flagIcon.className = "fa fa-flag";
        flagIcon.style.pointerEvents = "none";
        wrapper.appendChild(flagIcon);
        flagNode.appendChild(wrapper);
      }

      subLabelNode.innerHTML = "";

      const enabled = await getUserConfig("use_expressions");
      if (!enabled || !rawData.sidebarExpr || !rawData.sidebarContext) return;

      try {
        const result = await evaluateExpression({
          expr: rawData.sidebarExpr,
          context: rawData.sidebarContext,
          fallbackId: rawData.id,
          throwOnError: true,
        });

        if (result?.text) {
          const exprEl = buildExpressionLabel({
            text: result.text,
            classes: result.classes ?? [],
          });
          subLabelNode.appendChild(exprEl);
        }
      } catch (err) {
        console.warn("[sidebarManager] Expression failed:", err);
        const fallback = buildExpressionLabel({
          text: "[EXPR ERROR]",
          classes: ["expr-text-red", "expr-bold"],
        });
        subLabelNode.appendChild(fallback);
      }
    },

    filterFunction: (item) => !showOnlyFlagged || item.flagged,
    filterUI: wrapper, // ← wrapper now exists
    addButton: createAddButton({
      label: t("button.addEntry"),
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

  return {
    ...listManager,
    reloadList: () => listManager.loadList(),
  };
}
