// utils/fieldRenderers.js

import { ensureVirtualLocation } from "./vfsUtils.js";
import {
  wrapInputWithLabel,
  buildSwitchElement,
  addContainerElement,
} from "./elementBuilders.js";
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
  const wrapper = document.createElement("div");

  addContainerElement({
    parent: wrapper,
    tag: "div",
    className: "loop-marker loop-start",
    textContent: field.label || "Loop Start",
  });

  addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: {
      type: "hidden",
      name: field.key,
      value: "__loop_start__",
    },
  });

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
  const wrapper = document.createElement("div");

  addContainerElement({
    parent: wrapper,
    tag: "div",
    className: "loop-marker loop-stop",
    textContent: field.label || "Loop Stop",
  });

  addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: {
      type: "hidden",
      name: field.key,
      value: "__loop_stop__",
    },
  });

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

    const labelEl = addContainerElement({
      parent: wrapper,
      tag: "label",
    });
    labelEl.style.display = "block";

    addContainerElement({
      parent: labelEl,
      tag: "input",
      attributes: {
        type: "checkbox",
        name: field.key,
        value: value,
      },
      callback: (el) => {
        if ((field.default || []).includes(value)) {
          el.checked = true;
        }
      },
    });

    labelEl.appendChild(document.createTextNode(" " + label));
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
    const { value, label } = resolveOption(opt);

    const labelEl = addContainerElement({
      parent: wrapper,
      tag: "label",
    });
    labelEl.style.display = "block";

    addContainerElement({
      parent: labelEl,
      tag: "input",
      attributes: {
        type: "radio",
        name: field.key,
        value: value,
      },
      callback: (el) => {
        if (String(field.default) === String(value)) {
          el.checked = true;
        }
      },
    });

    labelEl.appendChild(document.createTextNode(" " + label));
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

  const textarea = addContainerElement({
    parent: wrapper,
    tag: "textarea",
    attributes: { name: field.key },
  });
  textarea.value = field.default || "";

  requestAnimationFrame(() => {
    let keystrokeCount = 0;

    const editor = new EasyMDE({
      element: textarea,
      minHeight: "80px",
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

  const input = addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: {
      type: "range",
      name: field.key,
      min: min,
      max: max,
      step: step,
    },
    callback: (el) => {
      el.value = value;
    },
  });

  const display = addContainerElement({
    parent: wrapper,
    tag: "span",
    className: "range-display",
    textContent: value,
    attributes: {
      style: "margin-left: 10px;",
    },
  });

  input.addEventListener("input", () => {
    display.textContent = input.value;
  });

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
export async function renderListField(field) {
  const wrapper = document.createElement("div");
  wrapper.dataset.type = "list";
  wrapper.dataset.listField = field.key;

  const items = field.default || [];

  for (const item of items) {
    const row = await createListItem(item, field.options || []);
    wrapper.appendChild(row);
  }

  const addBtn = addContainerElement({
    parent: wrapper,
    tag: "button",
    textContent: "+",
    attributes: {
      type: "button",
    },
  });

  addBtn.addEventListener("click", async () => {
    const row = await createListItem("", field.options || []);
    wrapper.insertBefore(row, addBtn);
    const input = row.querySelector("input");
    if (input && input.readOnly && typeof input.onclick === "function") {
      input.focus();
      input.click();
    }
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column
  );
}

async function createListItem(value, options = []) {
  const container = addContainerElement({
    tag: "div",
    className: "list-item",
  });

  const input = addContainerElement({
    parent: container,
    tag: "input",
    attributes: {
      type: "text",
      name: "list-item",
      class: "list-input",
    },
    callback: (el) => {
      el.value = value;
    },
  });

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

  const removeBtn = addContainerElement({
    parent: container,
    tag: "button",
    textContent: "-",
    className: "remove-btn",
    attributes: {
      type: "button",
    },
  });

  removeBtn.onclick = () => container.remove();

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

  const table = addContainerElement({
    parent: wrapper,
    tag: "table",
    className: "dynamic-table",
  });

  // Header
  const thead = addContainerElement({
    parent: table,
    tag: "thead",
  });

  const headRow = addContainerElement({
    parent: thead,
    tag: "tr",
  });

  columns.forEach((col) => {
    const { label } = resolveOption(col);
    addContainerElement({
      parent: headRow,
      tag: "th",
      textContent: label,
    });
  });

  // Add a header cell for the remove button
  addContainerElement({
    parent: headRow,
    tag: "th",
    textContent: "", // remove column header
  });

  // Body
  const tbody = addContainerElement({
    parent: table,
    tag: "tbody",
  });

  function createRow(values = []) {
    const tr = addContainerElement({
      tag: "tr",
    });

    columns.forEach((col, colIdx) => {
      const { value } = resolveOption(col);

      const td = addContainerElement({
        parent: tr,
        tag: "td",
      });

      const input = addContainerElement({
        parent: td,
        tag: "input",
        attributes: {
          type: "text",
          name: value,
        },
        callback: (el) => {
          el.value = values[colIdx] || "";
        },
      });
    });

    // Remove button cell
    const tdRemove = addContainerElement({
      parent: tr,
      tag: "td",
    });

    const removeBtn = addContainerElement({
      parent: tdRemove,
      tag: "button",
      textContent: "-",
      className: "remove-btn",
    });

    removeBtn.onclick = () => tr.remove();

    return tr;
  }

  rows.forEach((row) => {
    tbody.appendChild(createRow(row));
  });

  // Add Row Button
  const addBtn = addContainerElement({
    parent: wrapper,
    tag: "button",
    textContent: "+",
  });

  addBtn.onclick = () => {
    const newRow = createRow();
    tbody.appendChild(newRow);
  };

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

  const input = addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: {
      type: "file",
      name: field.key,
      accept: "image/png, image/jpeg",
    },
  });

  const preview = addContainerElement({
    parent: wrapper,
    tag: "img",
  });
  // preview.style.display = "none";

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

  wrapper.appendChild(deleteBtn);

  return wrapInputWithLabel(
    wrapper,
    field.label || "Image Upload",
    field.description
  );
}

// ─────────────────────────────────────────────
// Type: link
export async function renderLinkField(
  field,
  currentTemplate,
  { fetchTemplates, fetchMetaFiles }
) {
  const wrapper = addContainerElement({
    tag: "div",
    attributes: {
      style: "display: flex; flex-wrap: wrap; align-items: center; gap: 8px;",
    },
    callback: (el) => {
      el.dataset.linkField = field.key;
    },
  });

  // HIDDEN actual input
  const input = addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: {
      type: "hidden",
      name: field.key,
    },
    callback: (el) => {
      el.value = field.default || "";
    },
  });

  // Format dropdown
  const formatSelect = addContainerElement({
    parent: wrapper,
    tag: "select",
  });

  ["regular", "formidable"].forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    formatSelect.appendChild(o);
  });

  // Template dropdown (for formidable)
  const templateSelect = addContainerElement({
    parent: wrapper,
    tag: "select",
    attributes: {
      style: "display: none;",
    },
  });

  // Entry dropdown
  const entrySelect = addContainerElement({
    parent: wrapper,
    tag: "select",
    attributes: {
      style: "display: none;",
    },
  });

  // URL input (for regular)
  const urlInput = addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: {
      type: "text",
      placeholder: "Enter URL",
      style: "flex: 1; display: none;",
    },
  });

  // BUILD actual value
  function updateValue() {
    const format = formatSelect.value;

    if (format === "regular") {
      input.value = urlInput.value.trim();
    } else if (format === "formidable") {
      const tpl = templateSelect.value;
      const entry = entrySelect.value;
      if (tpl && entry) {
        input.value = `formidable://${tpl}:${entry}`;
      } else {
        input.value = "";
      }
    } else {
      input.value = "";
    }
  }

  // HANDLERS
  formatSelect.addEventListener("change", async () => {
    const fmt = formatSelect.value;

    if (fmt === "regular") {
      templateSelect.style.display = "none";
      entrySelect.style.display = "none";
      urlInput.style.display = "block";
    } else {
      templateSelect.style.display = "inline-block";
      entrySelect.style.display = "inline-block";
      urlInput.style.display = "none";

      await fillTemplateDropdown();
      await fillEntryDropdownForSelectedTemplate();
    }
    updateValue();
  });

  templateSelect.addEventListener("change", async () => {
    await fillEntryDropdownForSelectedTemplate();
    updateValue();
  });

  entrySelect.addEventListener("change", updateValue);
  urlInput.addEventListener("input", updateValue);

  // CALLBACK: fillTemplateDropdown
  async function fillTemplateDropdown() {
    const templates = await fetchTemplates();

    templateSelect.innerHTML = "";
    templates.forEach((tpl) => {
      const o = document.createElement("option");
      o.value = tpl.filename;
      o.textContent = tpl.filename;
      templateSelect.appendChild(o);
    });

    // Pre-select current template
    templateSelect.value = currentTemplate;
  }

  // CALLBACK: fillEntryDropdownForSelectedTemplate
  async function fillEntryDropdownForSelectedTemplate() {
    const tpl = templateSelect.value;
    if (!tpl) return;
    const metaFiles = await fetchMetaFiles(tpl);
    fillEntryDropdown(metaFiles);
  }

  // Helper
  function fillEntryDropdown(metaFiles) {
    entrySelect.innerHTML = "";
    metaFiles.forEach((file) => {
      const o = document.createElement("option");
      o.value = file;
      o.textContent = file;
      entrySelect.appendChild(o);
    });
  }

  // Init state
  formatSelect.value = "regular";
  urlInput.value = field.default || "";
  updateValue();

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column
  );
}
