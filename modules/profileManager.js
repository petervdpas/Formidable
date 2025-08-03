// modules/profileManager.js

import { EventBus } from "./eventBus.js";
import { createListManager } from "../utils/listUtils.js";
import { createProfileAddButton } from "./uiButtons.js";
import { t } from "../utils/i18n.js";

export function createProfileListManager() {
  // Build input + button row (but don’t attach it yet)
  const addNewRow = document.createElement("div");
  addNewRow.className = "modal-form-row tight-gap";

  const label = document.createElement("label");
  label.setAttribute("for", "new-profile-name");
  label.textContent = t("modal.profile.label.newProfile");

  const input = document.createElement("input");
  input.id = "new-profile-name";
  input.type = "text";
  input.placeholder = t("modal.profile.placeholder.newProfile");

  const button = createProfileAddButton(async () => {
    const name = input.value.trim();

    // Validation: lowercase letters, numbers, hyphens, ends with .json
    const valid = /^[a-z0-9-]+\.json$/.test(name);

    if (!valid) {
      EventBus.emit("ui:toast", {
        message: t("modal.profile.toast.invalidName"),
        variant: "error",
      });
      return;
    }

    const fullPath = await window.api.system.resolvePath("config", name);
    const exists = await window.api.system.fileExists(fullPath);

    if (exists) {
      EventBus.emit("ui:toast", {
        message: t("modal.profile.toast.profileExists"),
        variant: "warning",
      });
      return;
    }

    const success = await new Promise((resolve) => {
      EventBus.emit("config:profiles:switch", {
        filename: name,
        callback: resolve,
      });
    });

    if (success) {
      window.electron.window.reload();
    } else {
      EventBus.emit("ui:toast", {
        message: t("modal.profile.toast.switchFailed"),
        variant: "error",
      });
    }
  });

  addNewRow.appendChild(label);
  addNewRow.appendChild(input);
  addNewRow.appendChild(button);

  const listManager = createListManager({
    elementId: "profile-list",
    itemClass: "profile-item",

    fetchListFunction: async () =>
      await new Promise((resolve) => {
        EventBus.emit("config:profiles:list", { callback: resolve });
      }),

    onItemClick: async (profileFilename) => {
      const success = await new Promise((resolve) => {
        EventBus.emit("config:profiles:switch", {
          filename: profileFilename,
          callback: resolve,
        });
      });

      if (success) {
        window.electron.window.reload();
      } else {
        EventBus.emit("ui:toast", {
          message: t("modal.profile.toast.switchFailed"),
          variant: "error",
        });
      }
    },

    renderItemExtra: async ({ itemNode, rawData }) => {
      const subtitle = document.createElement("small");
      subtitle.textContent = `[${rawData.value}]`;

      Object.assign(subtitle.style, {
        opacity: "0.5",
        fontSize: "0.75em",
        marginLeft: "0.5em",
        fontStyle: "italic",
        pointerEvents: "none",
      });

      itemNode.appendChild(subtitle);
    },

    emptyMessage: t("modal.profile.noProfiles"),
  });

  return {
    ...listManager,
    addNewRow,
    reloadList: () => listManager.loadList(),
  };
}
