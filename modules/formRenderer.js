// modules/formRenderer.js

import { renderFieldElement } from "../utils/formUtils.js";
import { wrapInputWithLabel } from "../utils/elementBuilders.js";
import { log, warn, error } from "../utils/logger.js";

export function renderForm(container, template) {
  if (!container || !template) {
    console.warn("[FormRenderer] Missing container or template.");
    return { fieldElements: {}, saveButton: null };
  }

  log(
    "[FormRenderer] Rendering form for:",
    template.name || "Unnamed Template"
  );

  container.innerHTML = "";
  const fields = template.fields || [];
  const fieldElements = {};

  fields.forEach((field) => {
    const fieldRow = renderFieldElement(field);
    if (fieldRow) {
      const input = fieldRow.querySelector(`[name="${field.key}"]`);
      fieldElements[field.key] = input;
      container.appendChild(fieldRow);
    }
  });

  // Filename input
  const datafileInput = document.createElement("input");
  datafileInput.type = "text";
  datafileInput.id = "meta-json-filename";
  datafileInput.readOnly = true;

  const datafileRow = wrapInputWithLabel(datafileInput, "Filename");
  container.appendChild(datafileRow);

  // Buttons
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "btn btn-default btn-warn";

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "btn btn-default btn-danger";

  return { fieldElements, saveButton: saveBtn, deleteButton: deleteBtn };
}
