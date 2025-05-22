// utils/formUtils.js

import { EventBus } from "../modules/eventBus.js";
import { fieldTypes } from "./fieldTypes.js";
import * as renderers from "./fieldRenderers.js";

export function extractFieldDefinition({
  keyId = "edit-key",
  twoColumnId = "edit-two-column",
  labelId = "edit-label",
  descriptionId = "edit-description",
  defaultId = "edit-default",
  typeDropdown,
  optionsId = "edit-options",
}) {
  const key = document.getElementById(keyId)?.value.trim();
  const twoColumn = document.getElementById(twoColumnId)?.checked || false;
  const label = document.getElementById(labelId)?.value.trim();
  const description = document.getElementById(descriptionId)?.value.trim();
  const def = document.getElementById(defaultId)?.value.trim();
  const type = typeDropdown?.getSelected() || "text";

  const options = document
    .getElementById(optionsId)
    ?.value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const field = { key, label, type };
  if (def) field.default = def;
  if (description) field.description = description;
  if (twoColumn) field.two_column = true;
  if (options?.length) {
    field.options = options;
  }

  return field;
}

export function getFormData(container, template) {
  const data = {};
  const fields = template.fields || [];

  fields.forEach((field) => {
    const typeDef = fieldTypes[field.type];
    if (!typeDef || typeof typeDef.parseValue !== "function") {
      EventBus.emit("logging:warning", [
        `[getFormData] No parser for field type: ${field.type}`,
      ]);
      return;
    }

    const el = resolveFieldElement(container, field);

    if (!el) {
      EventBus.emit("logging:warning", [
        `[getFormData] Missing input for: ${field.key}`,
      ]);
      return;
    }

    data[field.key] = typeDef.parseValue(el);
  });

  EventBus.emit("logging:default", [
    "[getFormData] Collected form data:",
    data,
  ]);
  return data;
}

function resolveFieldElement(container, field) {
  switch (field.type) {
    case "radio":
      return container.querySelector(`[data-radio-group="${field.key}"]`);
    case "multioption":
      return container.querySelector(`[data-multioption-field="${field.key}"]`);
    case "list":
      return container.querySelector(`[data-list-field="${field.key}"]`);
    case "table":
      return container.querySelector(`[data-table-field="${field.key}"]`);
    default:
      return container.querySelector(`[name="${field.key}"]`);
  }
}

export function injectFieldDefaults(fields, metaData) {
  fields.forEach((field) => {
    const key = field.key;
    const type = field.type;
    const defFn = fieldTypes[type]?.defaultValue;

    if (!(key in metaData)) {
      metaData[key] = field.hasOwnProperty("default")
        ? field.default
        : typeof defFn === "function"
        ? defFn()
        : undefined;
    }
  });
}

export function clearFormUI(
  container,
  label = "Select or create a data-file to begin."
) {
  container.innerHTML = `<p>${label}</p>`;
  EventBus.emit("logging:default", ["[clearFormUI] Form UI cleared."]);
}

export function stripMarkdownExtension(filename = "") {
  return filename.replace(/\.md$/, "");
}

export function validateFilenameInput(inputEl) {
  const name = inputEl?.value.trim();
  return name || null;
}

export function renderFieldElement(field) {
  const type = field.type;
  const fn = renderers[`render${capitalize(type)}Field`];
  const typeDef = fieldTypes[type];

  if (!fn || !typeDef) {
    EventBus.emit("logging:default", [
      `[renderFieldElement] No renderer found for type: ${type}`,
    ]);
    return null;
  }

  // Ensure default is set if not explicitly provided
  if (!Object.prototype.hasOwnProperty.call(field, "default")) {
    field.default = typeDef.defaultValue();
  }

  return fn(field);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
