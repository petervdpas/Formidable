// utils/fieldRenderers.js

import { wrapInputWithLabel } from "./elementBuilders.js";
import { showOptionPopup } from "./popupUtils.js";

function resolveOption(opt) {
  return typeof opt === "string"
    ? { value: opt, label: opt }
    : {
        value: opt.value,
        label: opt.label ?? opt.value,
      };
}

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
    const { value, label } = resolveOption(opt);

    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
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
// Type: multioption
export function renderMultioptionField(field) {
  const wrapper = document.createElement("div");
  wrapper.dataset.multioptionField = field.key;

  (field.options || []).forEach((opt) => {
    const { value, label } = resolveOption(opt);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = field.key;
    input.value = value;
    input.checked = (field.default || []).includes(value);

    const labelEl = document.createElement("label");
    labelEl.style.display = "block";
    labelEl.appendChild(input);
    labelEl.appendChild(document.createTextNode(" " + label));
    wrapper.appendChild(labelEl);
  });

  return wrapInputWithLabel(
    wrapper,
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
    const { value, label } = resolveOption(opt); // ✅ Structured parsing

    const labelEl = document.createElement("label");
    labelEl.style.display = "block";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = field.key;
    input.value = value;

    // ✅ Compare to correct default value
    if (String(field.default) === String(value)) input.checked = true;

    labelEl.appendChild(input);
    labelEl.appendChild(document.createTextNode(" " + label));
    wrapper.appendChild(labelEl);
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
    const row = createListItem(item, field.options || []);
    wrapper.appendChild(row);
  });

  const addBtn = document.createElement("button");
  addBtn.textContent = "+";
  addBtn.onclick = () => {
    const row = createListItem("", field.options || []);
    wrapper.insertBefore(row, addBtn);
    const input = row.querySelector("input");
    if (input && input.readOnly && typeof input.onclick === "function") {
      input.focus();
      input.click();
    }
  };

  wrapper.appendChild(addBtn);

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column
  );
}

function createListItem(value, options = []) {
  const container = document.createElement("div");
  container.className = "list-item";

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.name = "list-item";
  input.className = "list-input";

  if (options.length > 0) {
    input.readOnly = true;
    input.onclick = () => showOptionPopup(input, options);

    const isValid = options.some((opt) =>
      typeof opt === "string" ? opt === value : opt.value === value
    );

    if (!isValid && value) {
      input.classList.add("invalid-option");
      input.placeholder = "⚠ Not in list";
      input.title = "This value is not in the allowed options";
    }
  }

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "-";
  removeBtn.className = "remove-btn";
  removeBtn.onclick = () => container.remove();

  container.appendChild(input);
  container.appendChild(removeBtn);
  return container;
}

/*
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
*/

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
    const { label } = resolveOption(col);
    const th = document.createElement("th");
    th.textContent = label;
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

    columns.forEach((col, colIdx) => {
      const { value } = resolveOption(col);
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.name = value;
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
