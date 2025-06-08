// utils/fieldRenderers.js

import { wrapInputWithLabel, buildSwitchElement } from "./elementBuilders.js";
import { applyDatasetMapping } from "./domUtils.js";
import { showOptionPopup } from "./popupUtils.js";
import { getCurrentTheme } from "../modules/themeToggle.js";

function resolveOption(opt) {
  return typeof opt === "string"
    ? { value: opt, label: opt }
    : {
        value: opt.value,
        label: opt.label ?? opt.value,
      };
}

// ─────────────────────────────────────────────
// Type: loopstart
export function renderLoopstartField(field) {
  const container = document.createElement("div");
  container.className = "loop-marker loop-start";
  container.textContent = field.label || "Loop Start";

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = field.key;
  hidden.value = "__loop_start__"; // of leeg

  const wrapper = document.createElement("div");
  wrapper.appendChild(container);
  wrapper.appendChild(hidden);

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column
  );
}

// ─────────────────────────────────────────────
// Type: loopstop
export function renderLoopstopField(field) {
  const container = document.createElement("div");
  container.className = "loop-marker loop-stop";
  container.textContent = field.label || "Loop Stop";

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = field.key;
  hidden.value = "__loop_stop__"; // of leeg

  const wrapper = document.createElement("div");
  wrapper.appendChild(container);
  wrapper.appendChild(hidden);

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column
  );
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
  let trailingLabel = null;

  if (Array.isArray(field.options) && field.options.length >= 2) {
    const first = resolveOption(field.options[0]);
    const second = resolveOption(field.options[1]);
    trailingLabel = [first.label, second.label];
  }

  const isChecked = String(field.default).toLowerCase() === "true";

  const { element: toggle } = buildSwitchElement({
    id: field.key,
    name: field.key,
    checked: isChecked,
    onFlip: null,
    trailingLabel,
  });

  return wrapInputWithLabel(
    toggle,
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
  const wrapper = document.createElement("div");
  wrapper.className = "markdown-editor-wrapper";

  const textarea = document.createElement("textarea");
  textarea.name = field.key;
  textarea.value = field.default || "";
  wrapper.appendChild(textarea);

  requestAnimationFrame(() => {
    let keystrokeCount = 0;

    const editor = new EasyMDE({
      element: textarea,
      theme: getCurrentTheme() === "dark" ? "monokai" : "eclipse",
      toolbar: [
        "bold",
        "italic",
        "strikethrough",
        "|",
        "quote",
        "unordered-list",
        "ordered-list",
        "|",
        "horizontal-rule",
        "code",
      ],
      status: [
        "lines",
        "words",
        {
          className: "characters",
          defaultValue(el) {
            el.innerHTML = "characters: 0";
          },
          onUpdate(el) {
            const text = editor.value() || "";
            el.innerHTML = `characters: ${text.length}`;
          },
        },
        {
          className: "keystrokes",
          defaultValue(el) {
            el.innerHTML = "0 Keystrokes";
          },
          onUpdate(el) {
            el.innerHTML = `${keystrokeCount} Keystrokes`;
          },
        },
      ],
      spellChecker: false,
      autoDownloadFontAwesome: false,
      minHeight: "120px",
    });

    const cm = editor.codemirror;

    cm.on("keydown", () => {
      keystrokeCount++;
    });

    cm.on("change", () => {
      textarea.value = editor.value();
      editor.updateStatusBar(); // triggers all custom status updates
    });
  });

  return wrapInputWithLabel(
    wrapper,
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
  wrapper.dataset.listField = field.key; // this is crucial for getFormData()

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

// ─────────────────────────────────────────────
// Type: image
export function renderImageField(field, template) {
  const wrapper = document.createElement("div");

  applyDatasetMapping(
    wrapper,
    [field, template],
    [
      { from: "key", to: "imageField" },
      { from: "storage_location", to: "storageLocation" },
    ]
  );

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png, image/jpeg";
  input.name = field.key;

  const preview = document.createElement("img");
  preview.style.maxWidth = "200px";
  preview.style.marginTop = "8px";
  preview.style.display = "block";

  // Don't try to load base64; just set alt if no image
  if (typeof field.default === "string" && field.default) {
    preview.alt = "Image set: " + field.default;
  }

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  wrapper.appendChild(input);
  wrapper.appendChild(preview);
  return wrapInputWithLabel(
    wrapper,
    field.label || "Image Upload",
    field.description
  );
}
