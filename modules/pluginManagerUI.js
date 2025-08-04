// modules/pluginManagerUI.js

import { EventBus } from "./eventBus.js";
import { buildButtonGroup } from "../utils/buttonUtils.js";
import { createListManager } from "../utils/listUtils.js";
import {
  createPluginToggleButton,
  createPluginDeleteButton,
} from "./uiButtons.js";
import { showConfirmModal } from "../utils/modalUtils.js";
import { t, tLow } from "../utils/i18n.js";

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
              message: `${t("standard.plugin")} "${rawData.name}" ${
                newState ? tLow("standard.enabled") : tLow("standard.disabled")
              }.`,
              variant: newState ? "success" : "warn",
            });
          } else {
            EventBus.emit("ui:toast", {
              message: `${t("toast.plugin.update.failed")} "${rawData.name}": ${
                result?.error
              }`,
              variant: "error",
            });
          }

          await listManager.loadList();
        }
      );

      const deleteBtn = createPluginDeleteButton(rawData.name, async () => {
        const confirmed = await showConfirmModal(
          `<div>${t("special.plugin.delete.sure")}</div>
           <div class="modal-message-highlight"><strong>${
             rawData.name
           }</strong></div>`,
          {
            okText: t("standard.delete"),
            cancelText: t("standard.cancel"),
            width: "auto",
            height: "auto",
          }
        );

        if (!confirmed) return;

        const result = await EventBus.emitWithResponse("plugin:delete", {
          folder: rawData.name,
        });

        if (result?.success) {
          EventBus.emit("ui:toast", {
            message: `${t("standard.plugin")} "${rawData.name}" ${tLow(
              "standard.deleted"
            )}.`,
            variant: "success",
          });
        } else {
          EventBus.emit("ui:toast", {
            message: `${t("toast.plugin.delete.failed")} "${rawData.name}": ${
              result?.error
            }`,
            variant: "error",
          });
        }

        await listManager.loadList();
      });

      const btnGroup = buildButtonGroup(toggleBtn, deleteBtn);
      flagNode.appendChild(btnGroup);
    },

    onItemClick: () => {},

    emptyMessage: t("special.noPluginsFound"),
  });

  await listManager.loadList();
  return listManager;
}
