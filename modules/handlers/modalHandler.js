// modules/handlers/modalHandler.js

import {
  createModalConfirmButton,
  createModalCancelButton,
  buildButtonGroup,
} from "../uiButtons.js";
import { sanitize } from "../../utils/stringUtils.js";
import { getCompactDate } from "../../utils/dateUtils.js";

// ─────────────────────────────────────────────────────────────
// Handle creation of a new template via modal
// ─────────────────────────────────────────────────────────────
export function handleTemplateConfirm({
  modal,
  callback,
}) {
  const nameInput = document.getElementById("template-name");
  const wrapper = document.getElementById("template-modal-buttons-wrapper");

  nameInput.value = "";

  const confirmBtn = createModalConfirmButton({
    id: "template-confirm",
    text: "Create",
    onClick: () => {
      const raw = nameInput.value.trim();
      if (!raw) return;

      const safe = sanitize(raw);
      const template = `${safe}.yaml`;

      modal.hide();
      callback({
        template,
        yaml: {
          name: safe,
          markdown_template: "",
          fields: [],
        },
      });
    },
  });

  const cancelBtn = createModalCancelButton({
    id: "template-cancel",
    onClick: () => modal.hide(),
  });

  wrapper.innerHTML = "";
  wrapper.appendChild(buildButtonGroup(confirmBtn, cancelBtn));
  modal.show();
  requestAnimationFrame(() => nameInput.focus());
}

// ─────────────────────────────────────────────────────────────
// Handle creation of a new entry (metadata file) via modal
// ─────────────────────────────────────────────────────────────
export function handleEntryConfirm({ modal, callback }) {
  const input = document.getElementById("entry-name");
  const checkbox = document.getElementById("entry-append-date");
  const wrapper = document.getElementById("entry-modal-buttons-wrapper");

  input.value = "";
  checkbox.checked = true;

  const confirmBtn = createModalConfirmButton({
    id: "entry-confirm",
    text: "Confirm",
    className: "btn-okay",
    onClick: () => {
      const raw = input.value.trim();
      if (!raw) return;

      const sanitized = sanitize(raw);
      const finalName = checkbox.checked
        ? `${sanitized}-${getCompactDate()}`
        : sanitized;

      modal.hide();
      callback(finalName);
    },
  });

  const cancelBtn = createModalCancelButton({
    id: "entry-cancel",
    onClick: () => modal.hide(),
  });

  wrapper.innerHTML = "";
  wrapper.appendChild(buildButtonGroup(confirmBtn, cancelBtn));
  modal.show();
  setTimeout(() => input.focus(), 100);
}
