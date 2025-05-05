// modules/formRenderer.js

import { fieldTypes } from "../utils/fieldTypes.js";
import { wrapInputWithLabel } from "../utils/elementBuilders.js";
import { log, warn, error } from "../utils/logger.js";

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
  const datafileInput = document.createElement("input");
  datafileInput.type = "text";
  datafileInput.id = "markdown-filename";

  const datafileRow = wrapInputWithLabel(datafileInput, "Filename (without extension)");
  container.appendChild(datafileRow);

  // 💾 Save button
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Input";
  saveBtn.className = "btn btn-default btn-info";

  return { fieldElements, saveButton: saveBtn };
}
