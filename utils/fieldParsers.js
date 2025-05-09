// utils/fieldParsers.js

import { warn } from "./logger.js";

// Text
export function parseTextField(input) {
  return input.value.trim();
}

// Boolean
export function parseBooleanField(input) {
  return input.checked;
}

// Dropdown
export function parseDropdownField(input) {
  return input.value;
}

// Radio
export function parseRadioField(wrapper) {
  const selected = wrapper.querySelector(
    `input[name="${wrapper.dataset.radioGroup}"]:checked`
  );
  return selected?.value || "";
}

// Textarea
export function parseTextareaField(input) {
  return input.value.trim();
}

// Number
export function parseNumberField(input) {
  return parseFloat(input.value) || 0;
}

// Date
export function parseDateField(input) {
  return input.value;
}

// List
export function parseListField(wrapper) {
  const items = Array.from(wrapper.querySelectorAll('input[type="text"]'));
  return items.map((input) => input.value.trim()).filter(Boolean);
}

// Table
export function parseTableField(input) {
  try {
    return JSON.parse(input.value);
  } catch {
    warn("[ParseTable] Invalid JSON input.");
    return [];
  }
}
