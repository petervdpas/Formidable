// modules/handlers.js

import {
  createModalConfirmButton,
  createModalCancelButton,
  buildButtonGroup,
} from "./uiButtons.js";

export function handleTemplateConfirm(modal, defaultStorageLocation, callback) {
  const nameInput = document.getElementById("template-name");
  const dirInput = document.getElementById("template-dir");
  const buttonsWrapper = document.getElementById(
    "template-modal-buttons-wrapper"
  );

  nameInput.value = "";
  dirInput.value = defaultStorageLocation;

  // ─── Sync dir input based on filename ───
  function updateDirValue() {
    const raw = nameInput.value.trim();
    const safeName = raw.replace(/\s+/g, "-").toLowerCase();
    dirInput.value = safeName
      ? `${defaultStorageLocation}/${safeName}`
      : "./storage";
  }

  nameInput.removeEventListener("input", updateDirValue);
  nameInput.addEventListener("input", updateDirValue);

  // ─── Dynamisch confirm button bouwen ───
  const confirmBtn = createModalConfirmButton({
    id: "template-confirm",
    text: "Create",
    onClick: async () => {
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
    },
  });

  // ─── Optioneel: ook X-button dynamisch maken ───
  const cancelBtn = createModalCancelButton({
    id: "template-cancel",
    onClick: () => modal.hide(),
  });

  buttonsWrapper.innerHTML = "";
  buttonsWrapper.appendChild(buildButtonGroup(confirmBtn, cancelBtn));

  modal.show();
  setTimeout(() => nameInput.focus(), 100);
}

export function handleEntryConfirm(modal, callback) {
  const input = document.getElementById("entry-name");
  const checkbox = document.getElementById("entry-append-date");
  const buttonsWrapper = document.getElementById("entry-modal-buttons-wrapper");

  input.value = "";
  checkbox.checked = true;

  const confirmBtn = createModalConfirmButton({
    id: "entry-confirm",
    text: "Confirm",
    className: "btn-okay", // optioneel voor groene knop
    onClick: () => {
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
    },
  });

  const cancelBtn = createModalCancelButton({
    id: "entry-cancel",
    onClick: () => modal.hide(),
  });

  buttonsWrapper.innerHTML = "";
  buttonsWrapper.appendChild(buildButtonGroup(confirmBtn, cancelBtn));

  modal.show();
  setTimeout(() => input.focus(), 100);
}
