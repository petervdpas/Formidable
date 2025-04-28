// modules/formInputManager.js

import { log } from "./logger.js";

export function renderForm(container, template) {
  if (!container || !template) {
    console.warn("[FormInputManager] Missing container or template.");
    return {};
  }

  log("[FormInputManager] Rendering form for:", template.name || "Unnamed Template");

  container.innerHTML = "";
  const fields = template.fields || [];
  const fieldElements = {};

  fields.forEach((field) => {
    const fieldDiv = document.createElement("div");
    fieldDiv.className = "form-row";

    const label = document.createElement("label");
    label.textContent = field.label;
    fieldDiv.appendChild(label);

    let input;
    if (field.type === "boolean") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = field.default === true;
    } else if (field.type === "dropdown") {
      input = document.createElement("select");
      (field.options || []).forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        input.appendChild(option);
      });
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.value = field.default || "";
    }

    input.name = field.key;
    fieldElements[field.key] = input;

    fieldDiv.appendChild(input);
    container.appendChild(fieldDiv);
  });

  // Special: Add filename input
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
