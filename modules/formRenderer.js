// modules/formRenderer.js

import { fieldTypes } from "./fieldTypes.js";
import { wrapInputWithLabel } from "./uiBehaviors.js";
import { warn, log } from "./logger.js";

export function renderForm(container, template) {
  if (!container || !template) {
    console.warn("[FormRenderer] Missing container or template.");
    return { fieldElements: {}, saveButton: null };
  }

  log("[FormRenderer] Rendering form for:", template.name || "Unnamed Template");

  container.innerHTML = "";
  const fields = template.fields || [];
  const fieldElements = {};

  fields.forEach((field) => {
    const typeDef = fieldTypes[field.type];
    if (!typeDef) {
      warn(`[FormRenderer] Unknown field type: ${field.type}`);
      return;
    }

    const input = typeDef.renderInput(field);
    if (!input) {
      warn(`[FormRenderer] No input rendered for: ${field.type}`);
      return;
    }

    fieldElements[field.key] = input;
    const fieldRow = wrapInputWithLabel(input, field.label);
    container.appendChild(fieldRow);
  });

  // Filename input
  const filenameInput = document.createElement("input");
  filenameInput.type = "text";
  filenameInput.id = "markdown-filename";

  const filenameRow = wrapInputWithLabel(filenameInput, "Filename (without extension)");
  container.appendChild(filenameRow);

  // 💾 Save button
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Input";
  saveBtn.className = "btn btn-default btn-info";

  return { fieldElements, saveButton: saveBtn };
}
