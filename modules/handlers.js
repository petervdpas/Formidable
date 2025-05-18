// modules/handlers.js

import { EventBus } from "./eventBus.js";

export function handleTemplateConfirm(modal, defaultStorageLocation, callback) {
  const nameInput = document.getElementById("template-name");
  const dirInput = document.getElementById("template-dir");
  const confirmBtn = document.getElementById("template-confirm");

  nameInput.value = "";
  dirInput.value = defaultStorageLocation;

  function updateDirValue() {
    const raw = nameInput.value.trim();
    const safeName = raw.replace(/\s+/g, "-").toLowerCase();
    if (safeName) {
      dirInput.value = `${defaultStorageLocation}/${safeName}`;
    } else {
      dirInput.value = "./storage";
    }
  }

  nameInput.removeEventListener("input", updateDirValue);
  nameInput.addEventListener("input", updateDirValue);

  confirmBtn.onclick = async () => {
    const raw = nameInput.value.trim();
    if (!raw) return;

    const safeName = raw.replace(/\s+/g, "-").toLowerCase();
    const template = `${safeName}.yaml`;
    const storage_location = dirInput.value.trim() || "markdown";

    modal.hide();

    callback({
      template,
      yaml: {
        name: safeName,
        storage_location,
        markdown_template: "",
        fields: [],
      },
    });
  };

  modal.show();
  setTimeout(() => nameInput.focus(), 100);
}

export async function handleEntryClick(entryName, formManager) {
  try {
    const template = window.currentSelectedTemplate;
    if (!template) {
      EventBus.emit("logging:warning", [
        "[MetaList] No template selected when clicking item.",
      ]);
      return;
    }
    const dir = template.storage_location;
    const data = await window.api.forms.loadForm(
      dir,
      entryName,
      template.fields || []
    );
    if (!data) {
      EventBus.emit("status:update", "Failed to load metadata entry.");
      return;
    }

    await formManager.loadFormData(data, entryName);

    EventBus.emit("context:select:form", entryName);
    EventBus.emit("status:update", `Loaded metadata: ${entryName}`);
  } catch (err) {
    EventBus.emit("logging:error", ["[MetaList] Failed to load entry:", err]);
    EventBus.emit("status:update", "Error loading metadata.");
  }
}

export function handleEntryConfirm(modal, callback) {
  const input = document.getElementById("entry-name");
  const checkbox = document.getElementById("entry-append-date");
  const confirm = document.getElementById("entry-confirm");

  input.value = "";
  checkbox.checked = true;

  confirm.onclick = () => {
    const raw = input.value.trim();
    if (!raw) return;

    const sanitized = raw.replace(/\s+/g, "-").toLowerCase();
    const appendDate = checkbox.checked;

    let finalName = sanitized;
    if (appendDate) {
      const now = new Date();
      const formatted = now.toISOString().slice(0, 10).replaceAll("-", "");
      finalName = `${sanitized}-${formatted}`;
    }

    modal.hide();
    callback(finalName);
  };

  modal.show();
  setTimeout(() => input.focus(), 100);
}
