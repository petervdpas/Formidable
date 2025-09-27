// modules/profileManager.js

import { EventBus } from "./eventBus.js";
import { createListManager } from "../utils/listUtils.js";
import { createFormRowInput } from "../utils/elementBuilders.js";
import { makePill } from "../utils/domUtils.js";
import { t } from "../utils/i18n.js";
import { Toast } from "../utils/toastUtils.js";
import { createProfileAddButton } from "./uiButtons.js";

async function createOrSwitchProfileByName(name) {
  const valid = /^[a-z0-9-]+\.json$/.test(name);
  if (!valid) {
    Toast.error("toast.profile.invalidName");
    return false;
  }

  const fullPath = await window.api.system.resolvePath("config", name);
  const exists = await window.api.system.fileExists(fullPath);
  if (exists) {
    Toast.warning("toast.profile.exists");
    return false;
  }

  const success = await new Promise((resolve) => {
    EventBus.emit("config:profiles:switch", {
      filename: name,
      callback: resolve,
    });
  });

  if (!success) {
    Toast.error("toast.profile.switchFailed");
    return false;
  }

  return true;
}

export function createProfileListManager({ currentProfile } = {}) {
  const addBtn = createProfileAddButton(async () => {
    const inputEl = document.getElementById("new-profile-name");
    const name = (inputEl?.value || "").trim();
    if (!name) {
      Toast.error("toast.profile.invalidName");
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
        Toast.error("toast.profile.switchFailed");
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
