// modules/handlers/modalHandler.js

import {
  buildButtonGroup,
  createConfirmButton,
  createCancelButton,
} from "../../utils/buttonUtils.js";
import { sanitize } from "../../utils/stringUtils.js";
import { getCompactDate } from "../../utils/dateUtils.js";
import { t } from "../../utils/i18n.js";

// ─────────────────────────────────────────────────────────────
// Handle creation of a new template via modal
// ─────────────────────────────────────────────────────────────
export function handleTemplateConfirm({ modal, callback }) {
  const nameInput = document.getElementById("template-name");
  const wrapper = document.getElementById("template-modal-buttons-wrapper");

  nameInput.value = "";

  const confirmBtn = createConfirmButton({
    id: "template-confirm",
    text: t("button.confirm"),
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

  const cancelBtn = createCancelButton({
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

  const confirmBtn = createConfirmButton({
    id: "entry-confirm",
    text: t("button.confirm"),
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

  const cancelBtn = createCancelButton({
    id: "entry-cancel",
    onClick: () => modal.hide(),
  });

  wrapper.innerHTML = "";
  wrapper.appendChild(buildButtonGroup(confirmBtn, cancelBtn));
  modal.show();
  setTimeout(() => input.focus(), 100);
}
