// utils/fieldRenderers.js

import { ensureVirtualLocation } from "./vfsUtils.js";
import { wrapInputWithLabel, buildSwitchElement } from "./elementBuilders.js";
import { applyDatasetMapping } from "./domUtils.js";
import { showOptionPopup } from "./popupUtils.js";
import { getCurrentTheme } from "../modules/themeToggle.js";
import { createRemoveImageButton } from "../modules/uiButtons.js";

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
export async function renderLoopstartField(field) {
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
export async function renderLoopstopField(field) {
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
export async function renderTextField(field) {
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
export async function renderBooleanField(field) {
  let trailingLabel = null;

  if (Array.isArray(field.options) && field.options.length >= 2) {
    const first = resolveOption(field.options[0]);
    const second = resolveOption(field.options[1]);
    trailingLabel = [first.label, second.label];
  }

  // Normalize true/false strictly
  const normalized = String(field.default).trim().toLowerCase();
  const isChecked = normalized === "true" || normalized === "1";

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
export async function renderDropdownField(field) {
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
export async function renderMultioptionField(field) {
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
export async function renderRadioField(field) {
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

    // Compare to correct default value
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
export async function renderTextareaField(field) {
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
export async function renderNumberField(field) {
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
// Type: range
export async function renderRangeField(field) {
  const wrapper = document.createElement("div");
  wrapper.dataset.rangeField = field.key;

  const optMap = Object.fromEntries(
    (field.options || []).map((pair) =>
      Array.isArray(pair)
        ? [pair[0], pair[1]]
        : [pair.value ?? pair, pair.label ?? pair]
    )
  );

  const min = parseFloat(optMap.min ?? field.min ?? 0);
  const max = parseFloat(optMap.max ?? field.max ?? 100);
  const step = parseFloat(optMap.step ?? field.step ?? 1);
  const value = field.default ?? (min + max) / 2;

  const input = document.createElement("input");
  input.type = "range";
  input.name = field.key;
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;

  const display = document.createElement("span");
  display.className = "range-display";
  display.textContent = input.value;
  display.style.marginLeft = "10px";

  input.addEventListener("input", () => {
    display.textContent = input.value;
  });

  wrapper.appendChild(input);
  wrapper.appendChild(display);

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column
  );
}

// ─────────────────────────────────────────────
// Type: date
export async function renderDateField(field) {
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
// ─────────────────────────────────────────────
// Type: list (dynamic add/remove)
export async function renderListField(field) {
  const wrapper = document.createElement("div");
  wrapper.dataset.type = "list";
  wrapper.dataset.listField = field.key; // crucial for getFormData()

  const items = field.default || [];

  for (const item of items) {
    const row = await createListItem(item, field.options || []);
    wrapper.appendChild(row);
  }

  const addBtn = document.createElement("button");
  addBtn.textContent = "+";
  addBtn.type = "button"; // Prevent form submission if inside <form>
  addBtn.addEventListener("click", async () => {
    const row = await createListItem("", field.options || []);
    wrapper.insertBefore(row, addBtn);
    const input = row.querySelector("input");
    if (input && input.readOnly && typeof input.onclick === "function") {
      input.focus();
      input.click();
    }
  });

  wrapper.appendChild(addBtn);

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column
  );
}

async function createListItem(value, options = []) {
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
  removeBtn.type = "button";
  removeBtn.onclick = () => container.remove();

  container.appendChild(input);
  container.appendChild(removeBtn);
  return container;
}

// ─────────────────────────────────────────────
// Type: table
export async function renderTableField(field) {
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
export async function renderImageField(field, template) {
  template = await ensureVirtualLocation(template);

  const wrapper = document.createElement("div");

  applyDatasetMapping(
    wrapper,
    [field, template],
    [
      { from: "key", to: "imageField" },
      { from: "virtualLocation", to: "virtualLocation" },
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

  const deleteBtn = createRemoveImageButton(() => {
    clearImage();
  }, `delete-${field.key}`);

  deleteBtn.style.display = "none";

  const setImage = (src, filename = "") => {
    preview.src = src;
    preview.style.display = "block";
    deleteBtn.style.display = "inline-block";
    wrapper.setAttribute("data-filename", filename);
  };

  const clearImage = () => {
    preview.src = "";
    preview.alt = "";
    preview.style.display = "none";
    input.value = "";
    deleteBtn.style.display = "none";
    wrapper.removeAttribute("data-filename");
  };

  // Load initial preview if filename is present
  if (typeof field.default === "string" && field.default) {
    wrapper.setAttribute("data-filename", field.default);
    if (template?.virtualLocation) {
      window.api.system
        .resolvePath(template.virtualLocation, "images", field.default)
        .then((fullPath) => {
          setImage(`file://${fullPath.replace(/\\/g, "/")}`, field.default);
        })
        .catch(() => {
          preview.alt = "Image not found";
          preview.style.display = "none";
        });
    }
  }

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result, file.name);
      };
      reader.readAsDataURL(file);
    }
  });

  requestAnimationFrame(() => {
    const existing = wrapper.getAttribute("data-filename");
    if (existing) {
      deleteBtn.style.display = "inline-block";
    }
  });

  wrapper.appendChild(input);
  wrapper.appendChild(preview);
  wrapper.appendChild(deleteBtn);

  return wrapInputWithLabel(
    wrapper,
    field.label || "Image Upload",
    field.description
  );
}
