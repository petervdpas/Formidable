// modules/formRenderer.js

import { fieldTypes } from "./fieldTypes.js";
import { warn, log } from "./logger.js";

export function renderForm(container, template) {
  if (!container || !template) {
    console.warn("[FormRenderer] Missing container or template.");
    return {};
  }

  log(
    "[FormRenderer] Rendering form for:",
    template.name || "Unnamed Template"
  );

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

  return fieldElements;
}

export function populateFormFields(container, template, data) {
  if (!data) {
    warn("[FormRenderer] No data to populate form fields.");
    return;
  }

  const fields = template.fields || [];

  fields.forEach((field) => {
    const typeDef = fieldTypes[field.type];
    if (!typeDef || typeof typeDef.renderInput !== "function") {
      warn(`[FormRenderer] No renderer for field type: ${field.type}`);
      return;
    }

    const input = container.querySelector(`[name="${field.key}"]`);
    if (!input) {
      warn(`[FormRenderer] Missing input for: ${field.key}`);
      return;
    }

    const value = data[field.key];

    if (input.type === "checkbox") {
      input.checked = value === true;
    } else if (input.type === "radio") {
      const group = container.querySelectorAll(
        `input[type="radio"][name="${field.key}"]`
      );
      group.forEach((el) => {
        el.checked = el.value === value;
      });
    } else if (
      input.tagName === "TEXTAREA" ||
      input.tagName === "INPUT" ||
      input.tagName === "SELECT"
    ) {
      input.value = value ?? "";
    } else {
      warn(`[FormRenderer] Unhandled input type for: ${field.key}`);
    }
  });

  log("[FormRenderer] Populated form fields from data.");
}
