// modules/handlers/fieldHandlers.js

import { EventBus } from "../eventBus.js";
import { resolveFieldByGuid } from "../../utils/formUtils.js";

/**
 * Get the container element for the current form
 */
function getFormContainer() {
  return document.querySelector("#form-container") || document.body;
}

/**
 * Handle: field:get-by-guid
 * Get field element by GUID
 */
export async function handleGetFieldByGuid({ guid }) {
  if (!guid) {
    EventBus.emit("logging:warning", [
      "[fieldHandlers] handleGetFieldByGuid: missing guid",
    ]);
    return null;
  }
  return resolveFieldByGuid(getFormContainer(), guid);
}

/**
 * Handle: field:get-by-key
 * Get first field element by key
 */
export async function handleGetFieldByKey({ key }) {
  if (!key) {
    EventBus.emit("logging:warning", [
      "[fieldHandlers] handleGetFieldByKey: missing key",
    ]);
    return null;
  }
  return getFormContainer().querySelector(`[data-field-key="${key}"]`);
}

/**
 * Handle: field:get-all-by-key
 * Get all field elements with the same key
 */
export async function handleGetAllFieldsByKey({ key }) {
  if (!key) {
    EventBus.emit("logging:warning", [
      "[fieldHandlers] handleGetAllFieldsByKey: missing key",
    ]);
    return [];
  }
  return Array.from(
    getFormContainer().querySelectorAll(`[data-field-key="${key}"]`)
  );
}

/**
 * Handle: field:get-all
 * Get metadata for all fields in the form
 */
export async function handleGetAllFields() {
  const fields = getFormContainer().querySelectorAll("[data-field-guid]");
  return Array.from(fields).map((el) => ({
    guid: el.dataset.fieldGuid,
    key: el.dataset.fieldKey,
    type: el.dataset.fieldType,
    loop: el.dataset.fieldLoop || null,
  }));
}

/**
 * Handle: field:get-value
 * Get field value by GUID
 */
export async function handleGetFieldValue({ guid }) {
  const el = await handleGetFieldByGuid({ guid });
  if (!el) {
    EventBus.emit("logging:warning", [
      `[fieldHandlers] handleGetFieldValue: field with GUID "${guid}" not found`,
    ]);
    return null;
  }

  // Handle different field types
  if (el.type === "checkbox") return el.checked;
  if (el.tagName === "SELECT") return el.value;
  return el.value;
}

/**
 * Handle: field:get-value-by-key
 * Get field value by key (first match)
 */
export async function handleGetFieldValueByKey({ key }) {
  const el = await handleGetFieldByKey({ key });
  if (!el) {
    EventBus.emit("logging:warning", [
      `[fieldHandlers] handleGetFieldValueByKey: field with key "${key}" not found`,
    ]);
    return null;
  }

  if (el.type === "checkbox") return el.checked;
  if (el.tagName === "SELECT") return el.value;
  return el.value;
}

/**
 * Handle: field:set-value
 * Set field value by GUID
 */
export async function handleSetFieldValue({ guid, value }) {
  const el = await handleGetFieldByGuid({ guid });
  if (!el) {
    EventBus.emit("logging:warning", [
      `[fieldHandlers] handleSetFieldValue: field with GUID "${guid}" not found`,
    ]);
    return { success: false };
  }

  // Handle different field types
  if (el.type === "checkbox") {
    el.checked = Boolean(value);
  } else {
    el.value = value;
  }

  // Trigger change event to ensure UI updates
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));

  return { success: true };
}

/**
 * Handle: field:set-value-by-key
 * Set field value by key (first match)
 */
export async function handleSetFieldValueByKey({ key, value }) {
  const el = await handleGetFieldByKey({ key });
  if (!el) {
    EventBus.emit("logging:warning", [
      `[fieldHandlers] handleSetFieldValueByKey: field with key "${key}" not found`,
    ]);
    return { success: false };
  }

  if (el.type === "checkbox") {
    el.checked = Boolean(value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));

  return { success: true };
}
