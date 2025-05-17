// utils/formUtils.js

import { fieldTypes } from "./fieldTypes.js";
import * as renderers from "./fieldRenderers.js";
import { warn, log } from "./logger.js";

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
      warn(`[FormUtils] No parser for field type: ${field.type}`);
      return;
    }

    let el;

    if (field.type === "radio") {
      el = container.querySelector(`[data-radio-group="${field.key}"]`);
    } else if (field.type === "list") {
      el = container.querySelector(`[data-list-field="${field.key}"]`);
    } else if (field.type === "table") {
      el = container.querySelector(`[data-table-field="${field.key}"]`);
    } else {
      el = container.querySelector(`[name="${field.key}"]`);
    }

    if (!el) {
      warn(`[FormUtils] Missing input for: ${field.key}`);
      return;
    }

    data[field.key] = typeDef.parseValue(el);
  });

  log("[FormData] Collected form data:", data);
  return data;
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
    warn(`[FormUtils] No renderer found for type: ${type}`);
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
