// modules/formRenderer.js

import { renderFieldElement } from "../utils/formUtils.js";
import { wrapInputWithLabel } from "../utils/elementBuilders.js";
import { EventBus } from "./eventBus.js";

export function renderForm(container, template) {
  if (!container || !template) {
    EventBus.emit("logging:warning", [
      "[FormRenderer] Missing container or template.",
    ]);
    return {
      fieldElements: {},
      saveButton: null,
      deleteButton: null,
      renderButton: null,
    };
  }

  EventBus.emit("logging:default", [
    "[FormRenderer] Rendering form for:",
    template.name || "Unnamed Template",
  ]);

  container.innerHTML = "";
  const fields = template.fields || [];
  const fieldElements = {};

  // Filename input FIRST
  const datafileInput = document.createElement("input");
  datafileInput.type = "text";
  datafileInput.id = "meta-json-filename";
  datafileInput.readOnly = true;

  const datafileRow = wrapInputWithLabel(datafileInput, "Filename");
  container.appendChild(datafileRow);

  // Now render field inputs
  fields.forEach((field) => {
    const fieldRow = renderFieldElement(field);
    if (fieldRow) {
      const input = fieldRow.querySelector(`[name="${field.key}"]`);
      fieldElements[field.key] = input;
      container.appendChild(fieldRow);
    }
  });

  // Buttons
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "btn btn-default btn-warn";

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "btn btn-default btn-danger";

  const renderBtn = document.createElement("button");
  renderBtn.textContent = "Render";
  renderBtn.className = "btn btn-default btn-info";

  return {
    fieldElements,
    saveButton: saveBtn,
    deleteButton: deleteBtn,
    renderButton: renderBtn,
  };
}
