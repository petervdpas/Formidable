// modules/profileManager.js

import { EventBus } from "./eventBus.js";
import { createListManager } from "../utils/listUtils.js";
import { createFormRowInput } from "../utils/elementBuilders.js";
import { createProfileAddButton } from "./uiButtons.js";
import { makePill } from "../utils/domUtils.js";
import { t } from "../utils/i18n.js";

async function createOrSwitchProfileByName(name) {
  const valid = /^[a-z0-9-]+\.json$/.test(name);
  if (!valid) {
    EventBus.emit("ui:toast", {
      languageKey: "toast.profile.invalidName",
      variant: "error",
    });
    return false;
  }

  const fullPath = await window.api.system.resolvePath("config", name);
  const exists = await window.api.system.fileExists(fullPath);
  if (exists) {
    EventBus.emit("ui:toast", {
      languageKey: "toast.profile.exists",
      variant: "warning",
    });
    return false;
  }

  const success = await new Promise((resolve) => {
    EventBus.emit("config:profiles:switch", {
      filename: name,
      callback: resolve,
    });
  });

  if (!success) {
    EventBus.emit("ui:toast", {
      languageKey: "toast.profile.switchFailed",
      variant: "error",
    });
    return false;
  }

  return true;
}

export function createProfileListManager({ currentProfile } = {}) {
  const addBtn = createProfileAddButton(async () => {
    const inputEl = document.getElementById("new-profile-name");
    const name = (inputEl?.value || "").trim();
    if (!name) {
      EventBus.emit("ui:toast", {
        languageKey: "toast.profile.invalidName",
        variant: "error",
      });
      return;
    }

    const ok = await createOrSwitchProfileByName(name);
    if (ok) window.electron.window.reload();
  });

  const addNewRow = createFormRowInput({
    id: "new-profile-name",
    labelOrKey: "modal.profile.label.newProfile",
    value: "",
    placeholder: t("modal.profile.placeholder.newProfile"),
    type: "text",
    configKey: "new-profile-name",
    i18nEnabled: true,
    append: addBtn, // ← builder will place this next to the input
  });

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
