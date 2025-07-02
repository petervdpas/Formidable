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
        () => {
          EventBus.emit(
            "plugin:update",
            {
              folder: rawData.name,
              updates: { enabled: !rawData.enabled },
            },
            () => listManager.loadList()
          );
        }
      );

      const deleteBtn = createPluginDeleteButton(rawData.name, () => {
        EventBus.emit(
          "plugin:delete",
          {
            folder: rawData.name,
          },
          () => listManager.loadList()
        );
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
