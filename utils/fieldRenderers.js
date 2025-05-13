// utils/fieldRenderers.js

import { wrapInputWithLabel } from "./elementBuilders.js";

// ─────────────────────────────────────────────
// Type: text
export function renderTextField(field) {
  const input = document.createElement("input");
  input.type = "text";
  input.name = field.key;
  input.value = "default" in field ? field.default : "";
  return wrapInputWithLabel(
    input,
    field.label,
    field.description,
    field.two_column
  );
}

// ─────────────────────────────────────────────
// Type: boolean
export function renderBooleanField(field) {
  const wrapper = document.createElement("label");
  wrapper.className = "switch";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = field.key;
  input.checked = "default" in field ? field.default === true : false;

  const slider = document.createElement("span");
  slider.className = "slider";

  wrapper.appendChild(input);
  wrapper.appendChild(slider);

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column
  );
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
  return wrapInputWithLabel(
    select,
    field.label,
    field.description,
    field.two_column
  );
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

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column
  );
}

// ─────────────────────────────────────────────
// Type: textarea
export function renderTextareaField(field) {
  const textarea = document.createElement("textarea");
  textarea.name = field.key;
  textarea.value = "default" in field ? field.default : "";
  return wrapInputWithLabel(
    textarea,
    field.label,
    field.description,
    field.two_column
  );
}

// ─────────────────────────────────────────────
// Type: number
export function renderNumberField(field) {
  const input = document.createElement("input");
  input.type = "number";
  input.name = field.key;
  input.value = "default" in field ? field.default : 0;
  return wrapInputWithLabel(
    input,
    field.label,
    field.description,
    field.two_column
  );
}

// ─────────────────────────────────────────────
// Type: date
export function renderDateField(field) {
  const input = document.createElement("input");
  input.type = "date";
  input.name = field.key;
  input.value = "default" in field ? field.default : "";
  return wrapInputWithLabel(
    input,
    field.label,
    field.description,
    field.two_column
  );
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

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column
  );
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
  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";
  wrapper.dataset.type = "table";
  wrapper.dataset.tableField = field.key;

  const columns = field.options || [];
  const rows = field.default || [];

  const table = document.createElement("table");
  table.className = "dynamic-table";

  // Header
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headRow.appendChild(th);
  });

  // Add a header cell for the remove button
  const thRemove = document.createElement("th");
  thRemove.textContent = ""; // for remove column
  headRow.appendChild(thRemove);

  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");

  function createRow(values = []) {
    const tr = document.createElement("tr");

    columns.forEach((_, colIdx) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.value = values[colIdx] || "";
      td.appendChild(input);
      tr.appendChild(td);
    });

    // Remove button cell
    const tdRemove = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "-";
    removeBtn.className = "remove-btn";
    removeBtn.onclick = () => tr.remove();
    tdRemove.appendChild(removeBtn);
    tr.appendChild(tdRemove);

    return tr;
  }

  rows.forEach((row) => {
    tbody.appendChild(createRow(row));
  });

  table.appendChild(tbody);

  // Add Row Button
  const addBtn = document.createElement("button");
  addBtn.textContent = "+";
  addBtn.onclick = () => {
    const newRow = createRow();
    tbody.appendChild(newRow);
  };

  wrapper.appendChild(table);
  wrapper.appendChild(addBtn);

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column
  );
}
