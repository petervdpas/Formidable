// modules/formData.js

import { fieldTypes } from "./fieldTypes.js";
import { warn, log } from "./logger.js";

export function getFormData(container, template) {
  const data = {};
  const fields = template.fields || [];

  fields.forEach((field) => {
    const typeDef = fieldTypes[field.type];
    if (!typeDef || typeof typeDef.parseValue !== "function") {
      warn(`[FormData] No parser for field type: ${field.type}`);
      return;
    }

    const el = container.querySelector(`[name="${field.key}"]`);
    if (!el) {
      warn(`[FormData] Missing input for: ${field.key}`);
      return;
    }

    data[field.key] = typeDef.parseValue(el);
  });

  log("[FormData] Collected form data:", data);
  return data;
}
