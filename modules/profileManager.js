// modules/profileManager.js

import { EventBus } from "./eventBus.js";
import { createListManager } from "./listManager.js";
import { createProfileAddButton } from "./uiButtons.js";

export function createProfileListManager() {
  // Build input + button row (but don’t attach it yet)
  const addNewRow = document.createElement("div");
  addNewRow.className = "modal-form-row tight-gap";

  const label = document.createElement("label");
  label.setAttribute("for", "new-profile-name");
  label.textContent = "New Profile";

  const input = document.createElement("input");
  input.id = "new-profile-name";
  input.type = "text";
  input.placeholder = "e.g., jack.json";

  const button = createProfileAddButton(async () => {
    const name = input.value.trim();

    // Validation: lowercase letters, numbers, hyphens, ends with .json
    const valid = /^[a-z0-9-]+\.json$/.test(name);

    if (!valid) {
      EventBus.emit("ui:toast", {
        message: "Use lowercase, hyphens, and end with .json",
        variant: "error",
      });
      return;
    }

    const fullPath = await window.api.system.resolvePath("config", name);
    const exists = await window.api.system.fileExists(fullPath);
    if (exists) {
      EventBus.emit("ui:toast", {
        message: "Profile already exists.",
        variant: "warning",
      });
      return;
    }

    await window.api.config.switchUserProfile(name);
    window.electron.window.reload();
  });

  addNewRow.appendChild(label);
  addNewRow.appendChild(input);
  addNewRow.appendChild(button);

  const listManager = createListManager({
    elementId: "profile-list",
    itemClass: "profile-item",
    fetchListFunction: async () => await window.api.config.listUserProfiles(),
    onItemClick: async (profileFilename) => {
      await window.api.config.switchUserProfile(profileFilename);
      window.electron.window.reload();
    },
    renderItemExtra: (element, raw) => {
      const subtitle = document.createElement("small");
      subtitle.textContent = `[${raw.value}]`;

      Object.assign(subtitle.style, {
        opacity: "0.5",
        fontSize: "0.75em",
        marginLeft: "0.5em",
        fontStyle: "italic",
        pointerEvents: "none",
      });

      element.appendChild(subtitle);
    },
    emptyMessage: "No profiles found.",
  });

  return {
    ...listManager,
    addNewRow,
    reloadList: () => listManager.loadList(),
  };
}
