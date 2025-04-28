// modules/formOutputManager.js

import { log, warn } from "./logger.js";

export function getFormData(container) {
  const data = {};
  container.querySelectorAll("input, select").forEach((el) => {
    if (el.name) {
      data[el.name] = el.type === "checkbox" ? el.checked : el.value;
    }
  });
  log("[FormOutputManager] Collected form data:", data);
  return data;
}

export function populateFormFields(fieldElements, data) {
  if (!data) {
    warn("[FormOutputManager] No data to populate form fields.");
    return;
  }

  for (const key in fieldElements) {
    const el = fieldElements[key];
    if (!el) continue;

    if (el.type === "checkbox") {
      el.checked = data[key] === true;
    } else {
      el.value = data[key] ?? "";
    }
  }

  log("[FormOutputManager] Populated form fields from data.");
}
