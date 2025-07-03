// modules/pluginManagerUI.js

import { EventBus } from "./eventBus.js";
import { buildButtonGroup } from "../utils/buttonUtils.js";
import { createListManager } from "../utils/listUtils.js";
import {
  createPluginToggleButton,
  createPluginDeleteButton,
} from "./uiButtons.js";

export async function renderPluginManager(container) {
  const listManager = createListManager({
    elementId: "plugin-list",
    itemClass: "plugin-list-item",
    titleKey: "name",

    fetchListFunction: async () => {
      const result = await EventBus.emitWithResponse("plugin:list", null);
      return (result || []).map((p) => ({
        ...p,
        display: p.name,
      }));
    },

    renderItemExtra: async ({ subLabelNode, flagNode, rawData }) => {
      subLabelNode.textContent = rawData.description || "(No description)";

      const toggleBtn = createPluginToggleButton(
        rawData.name,
        rawData.enabled,
        async () => {
          const newState = !rawData.enabled;

          if (typeof rawData.name !== "string") {
            EventBus.emit("logging:error", [
              `[PluginToggle] Invalid plugin name.`,
              rawData,
            ]);
            return;
          }

          const result = await EventBus.emitWithResponse("plugin:update", {
            folder: rawData.name,
            updates: { enabled: newState },
          });

          if (result?.success) {
            EventBus.emit("ui:toast", {
              message: `Plugin "${rawData.name}" ${
                newState ? "enabled" : "disabled"
              }.`,
              variant: newState ? "success" : "warn",
            });
          } else {
            EventBus.emit("ui:toast", {
              message: `Failed to update plugin "${rawData.name}": ${result?.error}`,
              variant: "error",
            });
          }

          await listManager.loadList();
        }
      );

      const deleteBtn = createPluginDeleteButton(rawData.name, async () => {
        const confirmed = window.confirm(`Delete plugin "${rawData.name}"?`);
        if (!confirmed) return;

        await EventBus.emitWithResponse("plugin:delete", {
          folder: rawData.name,
        });

        await listManager.loadList();
      });

      const btnGroup = buildButtonGroup(toggleBtn, deleteBtn);
      flagNode.appendChild(btnGroup);
    },

    onItemClick: () => {},

    emptyMessage: "No plugins found.",
  });

  await listManager.loadList();
  return listManager;
}
