// utils/fieldRenderers.js

import { wrapInputWithLabel } from "./elementBuilders.js";

// ─────────────────────────────────────────────
// Type: text
export function renderTextField(field) {
  const input = document.createElement("input");
  input.type = "text";
  input.name = field.key;
  input.value = "default" in field ? field.default : "";
  return wrapInputWithLabel(input, field.label);
}

// ─────────────────────────────────────────────
// Type: boolean
export function renderBooleanField(field) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = field.key;
  input.checked = "default" in field ? field.default === true : false;
  return wrapInputWithLabel(input, field.label);
}

// ─────────────────────────────────────────────
// Type: dropdown
export function renderDropdownField(field) {
  const select = document.createElement("select");
  (field.options || []).forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    select.appendChild(option);
  });
  select.name = field.key;
  select.value = "default" in field ? field.default : "";
  return wrapInputWithLabel(select, field.label);
}

// ─────────────────────────────────────────────
// Type: radio
export function renderRadioField(field) {
  const wrapper = document.createElement("div");
  wrapper.dataset.radioGroup = field.key;

  (field.options || []).forEach((opt) => {
    const label = document.createElement("label");
    label.style.display = "block";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = field.key;
    input.value = opt;
    if (opt === field.default) input.checked = true;

    label.appendChild(input);
    label.appendChild(document.createTextNode(" " + opt));
    wrapper.appendChild(label);
  });

  return wrapInputWithLabel(wrapper, field.label);
}

// ─────────────────────────────────────────────
// Type: textarea
export function renderTextareaField(field) {
  const textarea = document.createElement("textarea");
  textarea.name = field.key;
  textarea.value = "default" in field ? field.default : "";
  return wrapInputWithLabel(textarea, field.label);
}

// ─────────────────────────────────────────────
// Type: number
export function renderNumberField(field) {
  const input = document.createElement("input");
  input.type = "number";
  input.name = field.key;
  input.value = "default" in field ? field.default : 0;
  return wrapInputWithLabel(input, field.label);
}

// ─────────────────────────────────────────────
// Type: date
export function renderDateField(field) {
  const input = document.createElement("input");
  input.type = "date";
  input.name = field.key;
  input.value = "default" in field ? field.default : "";
  return wrapInputWithLabel(input, field.label);
}

// ─────────────────────────────────────────────
// Type: list
export function renderListField(field) {
  const input = document.createElement("input");
  input.type = "text";
  input.name = field.key;
  input.placeholder = "e.g., item1, item2";
  input.value = "default" in field ? (field.default || []).join(", ") : "";
  return wrapInputWithLabel(input, field.label);
}

// ─────────────────────────────────────────────
// Type: table
export function renderTableField(field) {
  const textarea = document.createElement("textarea");
  textarea.name = field.key;
  textarea.rows = 5;

  try {
    textarea.value =
      "default" in field ? JSON.stringify(field.default || [], null, 2) : "[]";
  } catch {
    textarea.value = "[]";
  }

  return wrapInputWithLabel(textarea, field.label);
}
