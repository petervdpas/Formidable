// modules/templateFieldEdit.js

import { EventBus } from "./eventBus.js";
import { fieldTypes } from "../utils/fieldTypes.js";

function applyModalTypeClass(modal, typeKey) {
  if (!modal) return;

  // Remove existing modal-* classes except "modal"
  modal.classList.forEach((cls) => {
    if (cls.startsWith("modal-") && cls !== "modal") {
      modal.classList.remove(cls);
    }
  });

  const typeDef = fieldTypes[typeKey];
  if (typeDef?.cssClass) {
    modal.classList.add(typeDef.cssClass); // e.g., modal-text
  } else {
    EventBus.emit("logging:warning", [
      `[FieldEditor] Unknown type "${typeKey}" passed to applyModalTypeClass.`,
    ]);
  }
}

export function setupFieldEditor(container, onChange) {
  const state = {};

  const dom = {
    key: container.querySelector("#edit-key"),
    label: container.querySelector("#edit-label"),
    description: container.querySelector("#edit-description"),
    twoColumn: container.querySelector("#edit-two-column"),
    default: container.querySelector("#edit-default"),
    options: container.querySelector("#edit-options"),
    type: container.querySelector("#edit-type-container select"),
  };

  function setField(field) {
    Object.assign(state, field);

    dom.key.value = field.key || "";
    dom.label.value = field.label || "";
    dom.description.value = field.description || "";
    dom.twoColumn.checked = !!field.two_column;
    dom.default.value = field.default ?? "";
    dom.options.value = field.options ? JSON.stringify(field.options) : "";
    if (dom.type) dom.type.value = field.type || "text";

    // 🔥 Automatically apply modal CSS class
    const modal = container.closest(".modal");
    applyModalTypeClass(modal, field.type || "text");

    onChange?.(structuredClone(state));
  }

  function getField() {
    return {
      key: dom.key.value.trim(),
      label: dom.label.value.trim(),
      description: dom.description.value.trim(),
      two_column: dom.twoColumn.checked,
      default: dom.default.value,
      options: dom.options.value ? JSON.parse(dom.options.value) : undefined,
      type: dom.type?.value || "text",
    };
  }

  return { setField, getField };
}
