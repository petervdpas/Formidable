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
// Type: list (dynamic add/remove)
export function renderListField(field) {
  const wrapper = document.createElement("div");
  wrapper.dataset.type = "list";
  wrapper.dataset.listField = field.key; // ✅ this is crucial for getFormData()

  const items = field.default || [];

  items.forEach((item) => {
    const input = createListItem(item);
    wrapper.appendChild(input);
  });

  const addBtn = document.createElement("button");
  addBtn.textContent = "+";
  addBtn.onclick = () => {
    const input = createListItem("");
    wrapper.insertBefore(input, addBtn);
  };
  wrapper.appendChild(addBtn);

  return wrapInputWithLabel(wrapper, field.label);
}

function createListItem(value) {
  const container = document.createElement("div");
  container.className = "list-item";

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.name = "list-item";
  input.className = "list-input";

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "-";
  removeBtn.className = "remove-btn";
  removeBtn.onclick = () => container.remove();

  container.appendChild(input);
  container.appendChild(removeBtn);
  return container;
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
