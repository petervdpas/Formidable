// utils/formUtils.js

import { fieldTypes } from "./fieldTypes.js";
import { warn, log } from "./logger.js";

export function extractFieldDefinition({
  keyId = "edit-key",
  labelId = "edit-label",
  defaultId = "edit-default",
  typeDropdown,
  markdownDropdown,
  optionsId = "edit-options",
}) {
  const key = document.getElementById(keyId)?.value.trim();
  const label = document.getElementById(labelId)?.value.trim();
  const def = document.getElementById(defaultId)?.value.trim();
  const type = typeDropdown?.getSelected() || "text";
  const markdown = markdownDropdown?.getSelected() || "";

  const options = document
    .getElementById(optionsId)
    ?.value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const field = { key, label, type };
  if (def) field.default = def;
  if (markdown) field.markdown = markdown;
  if (["dropdown", "radio"].includes(type) && options?.length) {
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

    const el = container.querySelector(`[name="${field.key}"]`);
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
