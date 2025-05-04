// modules/formRenderer.js
import { fieldTypes } from "./fieldTypes.js";
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
    const fieldDiv = document.createElement("div");
    fieldDiv.className = "form-row";

    const label = document.createElement("label");
    label.textContent = field.label;
    fieldDiv.appendChild(label);

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
    fieldDiv.appendChild(input);
    container.appendChild(fieldDiv);
  });

  const filenameDiv = document.createElement("div");
  filenameDiv.className = "form-row";

  const filenameLabel = document.createElement("label");
  filenameLabel.textContent = "Filename (without extension)";
  filenameDiv.appendChild(filenameLabel);

  const filenameInput = document.createElement("input");
  filenameInput.type = "text";
  filenameInput.id = "markdown-filename";
  filenameDiv.appendChild(filenameInput);

  container.appendChild(filenameDiv);

  // 💾 Save button
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Input";
  saveBtn.className = "btn btn-default btn-info";

  return { fieldElements, saveButton: saveBtn };
}
