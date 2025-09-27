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
import { Toast } from "../utils/toastUtils.js";

export async function renderPluginManager(container, modalApi) {
  const listManager = createListManager({
    elementId: "plugin-list",
    itemClass: "plugin-list-item",
    titleKey: "name",

    fetchListFunction: async () => {
      const result = await EventBus.emitWithResponse("plugin:list", null);
      return (result || []).map((p) => ({ ...p, display: p.name }));
    },

    renderItemExtra: async ({ subLabelNode, flagNode, rawData }) => {
      subLabelNode.textContent = rawData.description || "(No description)";

      // Toggle enable/disable
      const toggleBtn = createPluginToggleButton(
        rawData.name,
        rawData.enabled,
        async () => {
          const newState = !rawData.enabled;

          if (typeof rawData.name !== "string") {
            EventBus.emit("logging:error", [
              "[PluginToggle] Invalid plugin name.",
              rawData,
            ]);
            return;
          }

          modalApi?.setDisabled();
          try {
            const result = await EventBus.emitWithResponse("plugin:update", {
              folder: rawData.name,
              updates: { enabled: newState },
            });

            if (result?.success) {
              (newState ? Toast.success : Toast.warning)(
                "toast.plugin.status",
                [
                  rawData.name,
                  newState
                    ? tLow("standard.enabled")
                    : tLow("standard.disabled"),
                ]
              );
            } else {
              Toast.error("toast.plugin.update.failed", [
                rawData.name,
                result?.error,
              ]);
            }

            await listManager.loadList();
          } finally {
            modalApi?.setEnabled();
          }
        }
      );

      const deleteBtn = createPluginDeleteButton(rawData.name, async () => {
        modalApi?.setDisabled();

        const confirmed = await showConfirmModal(
          "special.plugin.delete.sure",
          `<div class="modal-message-highlight"><strong>${rawData.name}</strong></div>`,
          {
            okKey: "standard.delete",
            cancelKey: "standard.cancel",
            width: "auto",
            height: "auto",
          }
        );

        if (!confirmed) {
          modalApi?.setEnabled();
          return;
        }

        try {
          const result = await EventBus.emitWithResponse("plugin:delete", {
            folder: rawData.name,
          });

          if (result?.success) {
            Toast.success("toast.plugin.delete", [rawData.name]);
          } else {
            Toast.error("toast.plugin.delete.failed", [
              rawData.name,
              result?.error,
            ]);
          }

          await listManager.loadList();
        } finally {
          modalApi?.setEnabled();
        }
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
