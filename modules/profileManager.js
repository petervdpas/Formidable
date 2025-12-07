// modules/profileManager.js

import { EventBus } from "./eventBus.js";
import { createListManager } from "../utils/listUtils.js";
import { createFormRowInput } from "../utils/elementBuilders.js";
import { makePill } from "../utils/domUtils.js";
import { t } from "../utils/i18n.js";
import { Toast } from "../utils/toastUtils.js";
import {
  createProfileAddButton,
  createProfileExportButton,
  createProfileImportButton,
} from "./uiButtons.js";

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

async function exportProfileByName(filename) {
  return await new Promise((resolve) => {
    EventBus.emit("config:profiles:export", {
      filename,
      callback: resolve,
    });
  });
}

async function importProfileFromFile() {
  return await new Promise((resolve) => {
    EventBus.emit("config:profiles:import", {
      callback: resolve,
    });
  });
}

export function createProfileListManager({ currentProfile } = {}) {
  // --- create / import row ----------------------------------------
  const addBtn = createProfileAddButton(async () => {
    const inputEl = document.getElementById("new-profile-name");
    const name = (inputEl?.value || "").trim();
    if (!name) {
      Toast.error("toast.profile.invalidName");
      return;
    }

    const ok = await createOrSwitchProfileByName(name);
    if (ok) {
      window.electron.window.reload();
    }
  });

  const importBtn = createProfileImportButton(async () => {
    try {
      const result = await importProfileFromFile();

      // User cancelled → do nothing
      if (!result || result.cancelled) return;

      if (result.success) {
        Toast.success("toast.profile.importSuccess");
        window.electron.window.reload();
        return;
      }

      // If backend supplied a code, use a specific translation
      if (result.code) {
        switch (result.code) {
          case "not_found":
            Toast.error("toast.profile.import.error.not_found");
            return;

          case "invalid_name":
            Toast.error("toast.profile.import.error.invalid_name");
            return;

          case "boot_forbidden":
            Toast.error("toast.profile.import.error.boot_forbidden");
            return;

          case "exists":
            Toast.error("toast.profile.import.error.exists", [
              result.filename || "",
            ]);
            return;

          case "copy_failed":
            Toast.error("toast.profile.import.error.copy_failed");
            return;

          case "invalid_config":
            Toast.error("toast.profile.import.error.invalid_config");
            return;

          default:
            // fall through to generic handling below
            break;
        }
      }

      // No known code or unknown code → try to surface a reason string
      const reason =
        result.error ||
        result.errorMessage ||
        result.reason ||
        result.message ||
        "";

      if (reason) {
        Toast.error("toast.profile.importFailed.reason", [String(reason)]);
      } else {
        Toast.error("toast.profile.importFailed");
      }
    } catch (err) {
      const msg =
        (err && (err.message || String(err))) || "Unknown error";
      Toast.error("toast.profile.importFailed.reason", [msg]);
    }
  });

  // put them in one horizontal group
  const actionsGroup = document.createElement("div");
  actionsGroup.className = "inline-button-group";
  actionsGroup.appendChild(addBtn);
  actionsGroup.appendChild(importBtn);

  const addNewRow = createFormRowInput({
    id: "new-profile-name",
    labelOrKey: "modal.profile.label.newProfile",
    value: "",
    placeholder: t("modal.profile.placeholder.newProfile"),
    type: "text",
    configKey: "new-profile-name",
    i18nEnabled: true,
    append: actionsGroup,
  });

  // --- list manager ----------------------------------------------
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

      // hide unused sub label to remove the grey extra line
      const subDiv = itemNode.querySelector(".list-item-sub");
      if (subDiv) subDiv.style.display = "none";

      const pill = makePill(base, {
        size: "sm",
        variant: isCurrent ? "success" : "info",
        solid: isCurrent,
        outline: !isCurrent,
        dot: false,
        title: full,
      });
      pill.classList.add("profile-pill");

      const exportBtn = createProfileExportButton(async (e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
          const result = await exportProfileByName(base);

          if (result?.cancelled) return;

          if (result?.success) {
            Toast.success("toast.profile.exportSuccess");
          } else {
            Toast.error("toast.profile.exportFailed");
          }
        } catch (err) {
          const msg =
            (err && (err.message || String(err))) || "Unknown error";
          // You can later add toast.profile.exportFailed.reason if you want args here too
          Toast.error("toast.profile.exportFailed");
          EventBus.emit("logging:error", [
            "[profiles] export failed",
            msg,
          ]);
        }
      });

      const flagWrapper = itemNode.querySelector(".list-item-flag");
      if (flagWrapper) {
        flagWrapper.classList.add("profile-flag-wrap");
        flagWrapper.innerHTML = "";
        flagWrapper.appendChild(pill);
        flagWrapper.appendChild(exportBtn);
      } else {
        itemNode.appendChild(pill);
        itemNode.appendChild(exportBtn);
      }
    },

    emptyMessage: t("special.noProfilesFound"),
  });

  return {
    ...listManager,
    addNewRow,
    reloadList: () => listManager.loadList(),
  };
}
