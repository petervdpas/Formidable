// utils/fieldRenderers.js

import { ensureVirtualLocation } from "./vfsUtils.js";
import {
  wrapInputWithLabel,
  buildSwitchElement,
  addContainerElement,
  createFilePicker,
  createDirectoryPicker,
} from "./elementBuilders.js";
import {
  applyDatasetMapping,
  applyFieldContextAttributes,
  generateGuid,
} from "./domUtils.js";
import { showOptionPopup } from "./popupUtils.js";
import { getCurrentTheme } from "../modules/themeToggle.js";
import { createRemoveImageButton } from "../modules/uiButtons.js";

function resolveOption(opt) {
  return typeof opt === "string"
    ? { value: opt, label: opt }
    : { value: opt.value, label: opt.label ?? opt.value };
}

function resolveValue(field, value) {
  return value !== undefined && value !== null ? value : field.default ?? "";
}

// ─────────────────────────────────────────────
// Type: guid
export async function renderGuidField(field, value = "") {
  const guidValue = value?.trim?.() || generateGuid();

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.setAttribute("data-guid-field", field.key);
  hidden.value = guidValue;

  applyFieldContextAttributes(hidden, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return hidden;
}

// ─────────────────────────────────────────────
// Type: loopstart
export async function renderLoopstartField(field, value = "") {
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

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.context || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: loopstop
export async function renderLoopstopField(field, value = "") {
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

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: text
export async function renderTextField(field, value = "") {
  const v = resolveValue(field, value);
  const input = document.createElement("input");
  input.type = "text";
  input.name = field.key;
  input.value = v;

  applyFieldContextAttributes(input, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    input,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: boolean
export async function renderBooleanField(field, value = "") {
  let trailingLabel = null;
  if (Array.isArray(field.options) && field.options.length >= 2) {
    const first = resolveOption(field.options[0]);
    const second = resolveOption(field.options[1]);
    trailingLabel = [first.label, second.label];
  }

  const v = resolveValue(field, value);
  const normalized = String(v).trim().toLowerCase();
  const isChecked = normalized === "true" || normalized === "1";

  const { element: toggle } = buildSwitchElement({
    id: field.key,
    name: field.key,
    checked: isChecked,
    onFlip: null,
    trailingLabel,
  });

  applyFieldContextAttributes(toggle, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    toggle,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: dropdown
export async function renderDropdownField(field, value = "") {
  const v = resolveValue(field, value);
  const select = document.createElement("select");
  (field.options || []).forEach((opt) => {
    const { value, label } = resolveOption(opt);
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  select.name = field.key;
  select.value = v;

  applyFieldContextAttributes(select, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    select,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: multioption
export async function renderMultioptionField(field, value = "") {
  const v = resolveValue(field, value);
  const selected = Array.isArray(v) ? v : [];

  const wrapper = document.createElement("div");
  wrapper.dataset.multioptionField = field.key;

  (field.options || []).forEach((opt) => {
    const { value, label } = resolveOption(opt);

    const labelEl = addContainerElement({ parent: wrapper, tag: "label" });
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
        if (selected.includes(value)) {
          el.checked = true;
        }
      },
    });

    labelEl.appendChild(document.createTextNode(" " + label));
  });

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: radio
export async function renderRadioField(field, value = "") {
  const v = resolveValue(field, value);
  const wrapper = document.createElement("div");
  wrapper.dataset.radioGroup = field.key;

  (field.options || []).forEach((opt) => {
    const { value, label } = resolveOption(opt);

    const labelEl = addContainerElement({ parent: wrapper, tag: "label" });
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
        if (String(v) === String(value)) {
          el.checked = true;
        }
      },
    });

    labelEl.appendChild(document.createTextNode(" " + label));
  });

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: textarea
export async function renderTextareaField(field, value = "") {
  const v = resolveValue(field, value);
  const wrapper = document.createElement("div");
  wrapper.className = "markdown-editor-wrapper";

  const textarea = addContainerElement({
    parent: wrapper,
    tag: "textarea",
    attributes: { name: field.key },
  });

  // Use textContent to avoid HTML parsing issues
  // This is very important for security and consistency
  textarea.textContent = v;

  applyFieldContextAttributes(textarea, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  requestAnimationFrame(() => {
    let keystrokeCount = 0;
    let editorInstance = null;

    editorInstance = new EasyMDE({
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
            const text = editorInstance?.value?.() || "";
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

    const cm = editorInstance.codemirror;
    cm.on("keydown", () => {
      keystrokeCount++;
    });
    cm.on("change", () => {
      textarea.value = editorInstance.value();
      editorInstance.updateStatusBar();
    });
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: number
export async function renderNumberField(field, value = "") {
  const v = resolveValue(field, value);
  const input = document.createElement("input");
  input.type = "number";
  input.name = field.key;
  input.value = v;

  applyFieldContextAttributes(input, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    input,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: range
export async function renderRangeField(field, value = "") {
  const v = resolveValue(field, value);

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
  const resolved = v !== "" ? v : (min + max) / 2;

  const wrapper = document.createElement("div");
  wrapper.dataset.rangeField = field.key;

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
      el.value = resolved;
    },
  });

  const display = addContainerElement({
    parent: wrapper,
    tag: "span",
    className: "range-display",
    textContent: resolved,
    attributes: { style: "margin-left: 10px;" },
  });

  input.addEventListener("input", () => {
    display.textContent = input.value;
  });

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: date
export async function renderDateField(field, value = "") {
  const v = resolveValue(field, value);
  const input = document.createElement("input");
  input.type = "date";
  input.name = field.key;
  input.value = v;

  applyFieldContextAttributes(input, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    input,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: list (dynamic add/remove)
export async function renderListField(field, value = "") {
  const v = resolveValue(field, value);
  const items = Array.isArray(v) ? v : [];

  const wrapper = document.createElement("div");
  wrapper.dataset.type = "list";
  wrapper.dataset.listField = field.key;

  for (const item of items) {
    const row = await createListItem(item, field.options || []);
    wrapper.appendChild(row);
  }

  const addBtn = addContainerElement({
    parent: wrapper,
    tag: "button",
    textContent: "+",
    attributes: { type: "button" },
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

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

async function createListItem(value, options = []) {
  const container = addContainerElement({
    tag: "div",
    className: "list-field-item",
  });

  const input = addContainerElement({
    parent: container,
    tag: "input",
    attributes: {
      type: "text",
      name: "list-item",
      className: "list-input",
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
    attributes: { type: "button" },
  });

  removeBtn.onclick = () => container.remove();

  return container;
}

// ─────────────────────────────────────────────
// Type: table
export async function renderTableField(field, value = "") {
  const v = resolveValue(field, value);
  const rows = Array.isArray(v) ? v : [];
  const columns = field.options || [];

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";
  wrapper.dataset.type = "table";
  wrapper.dataset.tableField = field.key;

  const table = addContainerElement({
    parent: wrapper,
    tag: "table",
    className: "dynamic-table",
  });

  const thead = addContainerElement({ parent: table, tag: "thead" });
  const headRow = addContainerElement({ parent: thead, tag: "tr" });

  columns.forEach((col) => {
    const { label } = resolveOption(col);
    addContainerElement({
      parent: headRow,
      tag: "th",
      textContent: label,
    });
  });

  addContainerElement({ parent: headRow, tag: "th", textContent: "" }); // remove button header

  const tbody = addContainerElement({ parent: table, tag: "tbody" });

  function createRow(values = []) {
    const tr = addContainerElement({ tag: "tr" });

    columns.forEach((col, colIdx) => {
      const { value } = resolveOption(col);
      const td = addContainerElement({ parent: tr, tag: "td" });

      addContainerElement({
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

    const tdRemove = addContainerElement({ parent: tr, tag: "td" });
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

  const addBtn = addContainerElement({
    parent: wrapper,
    tag: "button",
    textContent: "+",
  });

  addBtn.onclick = () => {
    const newRow = createRow();
    tbody.appendChild(newRow);
  };

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: image
export async function renderImageField(field, value = "", template) {
  template = await ensureVirtualLocation(template);
  const v = resolveValue(field, value);

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

  const preview = addContainerElement({ parent: wrapper, tag: "img" });
  const deleteBtn = createRemoveImageButton(
    () => clearImage(),
    `delete-${field.key}`
  );
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

  if (typeof v === "string" && v) {
    wrapper.setAttribute("data-filename", v);
    if (template?.virtualLocation) {
      window.api.system
        .resolvePath(template.virtualLocation, "images", v)
        .then((fullPath) => {
          setImage(`file://${fullPath.replace(/\\/g, "/")}`, v);
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

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label || "Image Upload",
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: link
export async function renderLinkField(
  field,
  value = "",
  currentTemplate,
  { fetchTemplates, fetchMetaFiles }
) {
  const v = resolveValue(field, value);

  const wrapper = addContainerElement({
    tag: "div",
    attributes: {
      style: "display: flex; flex-wrap: wrap; align-items: center; gap: 8px;",
    },
    callback: (el) => {
      el.dataset.linkField = field.key;
    },
  });

  const input = addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: {
      type: "hidden",
      name: field.key,
    },
    callback: (el) => {
      el.value = v;
    },
  });

  const formatSelect = addContainerElement({ parent: wrapper, tag: "select" });
  ["regular", "formidable"].forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    formatSelect.appendChild(o);
  });

  const templateSelect = addContainerElement({
    parent: wrapper,
    tag: "select",
    attributes: { style: "display: none;" },
  });

  const entrySelect = addContainerElement({
    parent: wrapper,
    tag: "select",
    attributes: { style: "display: none;" },
  });

  const urlInput = addContainerElement({
    parent: wrapper,
    tag: "input",
    attributes: {
      type: "text",
      placeholder: "Enter URL",
      style: "flex: 1; display: none;",
    },
  });

  function updateValue() {
    const format = formatSelect.value;

    if (format === "regular") {
      input.value = urlInput.value.trim();
    } else if (format === "formidable") {
      const tpl = templateSelect.value;
      const entry = entrySelect.value;
      input.value = tpl && entry ? `formidable://${tpl}:${entry}` : "";
    } else {
      input.value = "";
    }
  }

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

  async function fillTemplateDropdown() {
    const templates = await fetchTemplates();
    templateSelect.innerHTML = "";
    templates.forEach((tpl) => {
      const o = document.createElement("option");
      o.value = tpl.filename;
      o.textContent = tpl.filename;
      templateSelect.appendChild(o);
    });
    templateSelect.value = currentTemplate;
  }

  async function fillEntryDropdownForSelectedTemplate() {
    const tpl = templateSelect.value;
    if (!tpl) return;
    const metaFiles = await fetchMetaFiles(tpl);
    fillEntryDropdown(metaFiles);
  }

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
  urlInput.value = v;
  updateValue();

  applyFieldContextAttributes(wrapper, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return wrapInputWithLabel(
    wrapper,
    field.label,
    field.description,
    field.two_column,
    field.wrapper || "form-row"
  );
}

// ─────────────────────────────────────────────
// Type: file
export async function renderFileField(field, value = "") {
  const v = resolveValue(field, value);
  const id = field.key;

  const { element, input, button } = createFilePicker({
    id,
    value: v,
    placeholder: field.placeholder || "",
    noWrapping: true,
    label: field.label || "Select File",
    outerClass: field.wrapper || "form-row tight-gap",
  });

  input.name = field.key;

  button.onclick = async () => {
    const selected = await window.api.dialog.chooseFile();
    if (selected) {
      input.value = selected;
      if (typeof field.onSave === "function") {
        await field.onSave(field, selected);
      }
    }
  };

  applyFieldContextAttributes(element, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return element;
}

// ─────────────────────────────────────────────
// Type: directory
export async function renderDirectoryField(field, value = "") {
  const v = resolveValue(field, value);
  const id = field.key;

  const { element, input, button } = createDirectoryPicker({
    id,
    value: v,
    placeholder: field.placeholder || "",
    noWrapping: true,
    label: field.label || "Select Directory",
    outerClass: field.wrapper || "form-row tight-gap",
  });

  input.name = field.key;

  button.onclick = async () => {
    const selected = await window.api.dialog.chooseDirectory();
    if (selected) {
      input.value = selected;
      if (typeof field.onSave === "function") {
        await field.onSave(field, selected);
      }
    }
  };

  applyFieldContextAttributes(element, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey || null,
  });

  return element;
}
