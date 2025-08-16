// modules/profileManager.js

import { EventBus } from "./eventBus.js";
import { createListManager } from "../utils/listUtils.js";
import { createProfileAddButton } from "./uiButtons.js";
import { makePill } from "../utils/domUtils.js";
import { t } from "../utils/i18n.js";

export function createProfileListManager({ currentProfile } = {}) {
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
        languageKey: "toast.profile.invalidName",
        variant: "error",
      });
      return;
    }

    const fullPath = await window.api.system.resolvePath("config", name);
    const exists = await window.api.system.fileExists(fullPath);

    if (exists) {
      EventBus.emit("ui:toast", {
        languageKey: "toast.profile.exists",
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
        languageKey: "toast.profile.switchFailed",
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
          languageKey: "toast.profile.switchFailed",
          variant: "error",
        });
      }
    },

    renderItemExtra: async ({ itemNode, rawData }) => {
      const full =
        (rawData && (rawData.value ?? rawData.name)) ||
        (typeof rawData === "string" ? rawData : "") ||
        "";

      const base = full.split(/[\\/]/).pop() || full;

      const isCurrent =
        rawData?.name === currentProfile ||
        base === currentProfile ||
        full === currentProfile;

      const pill = makePill(base, {
        size: "sm",
        variant: isCurrent ? "success" : "info",
        solid: isCurrent,
        outline: !isCurrent,
        dot: false,
        title: full,
      });

      pill.style.marginLeft = "0.5em";

      itemNode.appendChild(pill);
    },

    emptyMessage: t("special.noProfilesFound"),
  });

  return {
    ...listManager,
    addNewRow,
    reloadList: () => listManager.loadList(),
  };
}
