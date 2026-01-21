// utils/fieldFactory.js
// Minimal, dependency-free DOM blueprints for Formidable field types.
// Excludes: api, guid, loopstart, loopstop. Focus: produce the core DOM for each type.

import { createListItem } from "./listItemFactory.js";
import { createIconButton } from "./buttonUtils.js";
import {
  addContainerElement,
  createDirectoryPicker,
  createFilePicker,
  buildSwitchElement,
} from "./elementBuilders.js";
import { getCurrentTheme } from "./themeUtils.js";

export function resolveOption(opt) {
  return typeof opt === "string"
    ? { value: opt, label: opt }
    : { value: opt?.value ?? "", label: opt?.label ?? opt?.value ?? "" };
}

export function resolveValue(field, value) {
  return value !== undefined && value !== null ? value : field?.default ?? "";
}

export function setCommon(el, field) {
  if (!field) return el;
  if (field.key) el.name = field.key;
  if (
    field.readonly === true ||
    String(field.readonly).toLowerCase() === "true"
  ) {
    el.readOnly = true;
  }
  return el;
}

// Simple helpers used by a few blueprints
function makeContainer(tag = "div", cls = "") {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

// ─────────────────────────────────────────────
// Blueprints registry
// Each entry: (field, value) => HTMLElement
// Return value is the ROOT element for this field's core UI (no wrapper/label).

export const FieldBlueprints = {
  // text
  text(field, value) {
    const v = resolveValue(field, value);
    const input = document.createElement("input");
    input.type = "text";
    input.value = v;
    return setCommon(input, field);
  },

  // boolean -> simple checkbox (no custom switch)
  boolean(field, value) {
    let trailingValues = ["On", "Off"];
    if (Array.isArray(field.options) && field.options.length >= 2) {
      const first = resolveOption(field.options[0]);
      const second = resolveOption(field.options[1]);
      trailingValues = [first.label, second.label];
    }

    const v = String(resolveValue(field, value)).trim().toLowerCase();
    const isChecked = v === "true" || v === "1";
    const onFlip = typeof field.onFlip === "function" ? field.onFlip : null;
    const { element: toggle } = buildSwitchElement({
      id: field.key,
      name: field.key,
      checked: isChecked,
      onFlip,
      trailingValues,
    });

    return toggle;
  },

  // dropdown (select)
  dropdown(field, value) {
    const v = resolveValue(field, value);
    const select = document.createElement("select");
    for (const opt of field.options || []) {
      const { value, label } = resolveOption(opt);
      const o = document.createElement("option");
      o.value = String(value ?? "");
      o.textContent = String(label ?? "");
      select.appendChild(o);
    }
    select.value = String(v ?? "");
    return setCommon(select, field);
  },

  // multioption: stack of checkboxes in a container
  multioption(field, value) {
    const v = resolveValue(field, value);
    const selected = Array.isArray(v) ? v : [];

    const wrapper = document.createElement("div");
    wrapper.dataset.multioptionField = field.key;

    (field.options || []).forEach((opt) => {
      const { value: optVal, label } = resolveOption(opt);

      const labelEl = addContainerElement({ parent: wrapper, tag: "label" });
      labelEl.style.display = "block";

      addContainerElement({
        parent: labelEl,
        tag: "input",
        attributes: {
          type: "checkbox",
          name: field.key,
          value: optVal,
        },
        callback: (el) => {
          if (selected.includes(optVal)) el.checked = true;
        },
      });

      labelEl.appendChild(document.createTextNode(" " + String(label ?? "")));
    });

    return wrapper;
  },

  // radio: stack of radios in a container
  radio(field, value) {
    const v = resolveValue(field, value);
    const wrapper = document.createElement("div");
    wrapper.dataset.radioGroup = field.key;

    (field.options || []).forEach((opt) => {
      const { value: optVal, label } = resolveOption(opt);

      const labelEl = addContainerElement({ parent: wrapper, tag: "label" });
      labelEl.style.display = "block";

      addContainerElement({
        parent: labelEl,
        tag: "input",
        attributes: {
          type: "radio",
          name: field.key,
          value: optVal,
        },
        callback: (el) => {
          if (String(v) === String(optVal)) el.checked = true;
        },
      });

      labelEl.appendChild(document.createTextNode(" " + String(label ?? "")));
    });

    return wrapper;
  },

  // textarea (plain or markdown)
  textarea(field, value) {
    const v = resolveValue(field, value);
    const wrapper = document.createElement("div");
    wrapper.className = "markdown-editor-wrapper";

    const textarea = addContainerElement({
      parent: wrapper,
      tag: "textarea",
      attributes: { name: field.key },
    });
    textarea.value = v;

    // Apply readonly for plain text mode only
    const isPlainText = field.format === "plain" || typeof window.EasyMDE !== "function";
    if (isPlainText && (
      field.readonly === true ||
      String(field.readonly).toLowerCase() === "true"
    )) {
      textarea.readOnly = true;
    }

    // Plain mode or EasyMDE missing
    if (field.format === "plain" || typeof window.EasyMDE !== "function") {
      const status = document.createElement("div");
      status.className = "textarea-statusbar";
      status.innerHTML = `
      <span class="lines">lines: 0</span>
      <span class="words">words: 0</span>
      <span class="characters">characters: 0</span>
      <span class="keystrokes">0 Keystrokes</span>`;
      wrapper.appendChild(status);

      let keystrokes = 0;

      function updateStatus() {
        const text = textarea.value || "";
        const lines = text.split(/\r\n|\r|\n/).length;
        const words = (text.trim().match(/\S+/g) || []).length;
        const chars = text.length;
        status.querySelector(".lines").textContent = `lines: ${lines}`;
        status.querySelector(".words").textContent = `words: ${words}`;
        status.querySelector(
          ".characters"
        ).textContent = `characters: ${chars}`;
        status.querySelector(
          ".keystrokes"
        ).textContent = `${keystrokes} Keystrokes`;
      }

      textarea.addEventListener("keydown", () => {
        keystrokes++;
      });
      textarea.addEventListener("input", () => {
        updateStatus();
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 600) + "px";
      });

      requestAnimationFrame(() => {
        textarea.style.minHeight = "80px";
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 600) + "px";
        updateStatus();
      });

      return wrapper;
    }

    // Markdown mode (EasyMDE)
    requestAnimationFrame(() => {
      let keystrokeCount = 0;
      const editorInstance = new EasyMDE({
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

      textarea.__mde = editorInstance;

      const cm = editorInstance.codemirror;
      cm.on("keydown", () => {
        keystrokeCount++;
      });
      cm.on("change", () => {
        textarea.value = editorInstance.value();
        editorInstance.updateStatusBar();
      });

      setTimeout(() => cm.refresh(), 0);

      const io = new IntersectionObserver((entries) => {
        for (const e of entries)
          if (e.isIntersecting) setTimeout(() => cm.refresh(), 0);
      });
      io.observe(wrapper);
    });

    return wrapper;
  },

  // number
  number(field, value) {
    const v = resolveValue(field, value);
    const input = document.createElement("input");
    input.type = "number";
    if (v !== "") input.value = v;
    if (field.min != null) input.min = field.min;
    if (field.max != null) input.max = field.max;
    if (field.step != null) input.step = field.step;
    return setCommon(input, field);
  },

  // range + display (minimal)
  range(field, value) {
    const v = resolveValue(field, value);

    // allow numeric metadata from field.options
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
    wrapper.className = "bp-range";
    wrapper.dataset.rangeField = field.key;

    const input = addContainerElement({
      parent: wrapper,
      tag: "input",
      attributes: {
        type: "range",
        name: field.key,
        min,
        max,
        step,
      },
      callback: (el) => {
        el.value = resolved;
      },
    });

    const display = addContainerElement({
      parent: wrapper,
      tag: "span",
      className: "range-display",
      textContent: String(resolved),
      attributes: { style: "margin-left: 10px;" },
    });

    input.addEventListener("input", () => {
      display.textContent = input.value;
    });

    return wrapper;
  },

  // date
  date(field, value) {
    const v = resolveValue(field, value);
    const input = document.createElement("input");
    input.type = "date";
    if (v) input.value = String(v);
    return setCommon(input, field);
  },

  // list: dynamic add/remove, sortable (full version)
  list(field, value) {
    const v = resolveValue(field, value);
    const items = Array.isArray(v) ? v : [];

    const wrapper = document.createElement("div");
    wrapper.dataset.type = "list";
    wrapper.dataset.listField = field.key;

    wrapper.classList.add("inner-dnd");
    const loopChain = Array.isArray(field.loopKey)
      ? field.loopKey.join(".")
      : field.loopKey || "root";
    const scope = `list:${field.key}:${loopChain}:${crypto
      .randomUUID()
      .slice(0, 8)}`;
    wrapper.dataset.dndScope = scope;

    // Add sortable container inside wrapper
    const sortableList = document.createElement("div");
    sortableList.className = "sortable-list";
    sortableList.dataset.dndScope = scope;
    wrapper.appendChild(sortableList);

    for (const item of items) {
      const row = createListItem(item, field.options || []);
      sortableList.appendChild(row);
    }

    const addBtn = addContainerElement({
      parent: wrapper,
      tag: "button",
      className: "add-list-button",
      textContent: "+",
      attributes: { type: "button" },
    });

    addBtn.addEventListener("click", async () => {
      const row = createListItem("", field.options || []);
      sortableList.appendChild(row);
      const input = row.querySelector("input");
      if (input && input.readOnly && typeof input.onclick === "function") {
        input.focus();
        input.click();
      }
    });

    return wrapper;
  },

  // table: same DOM + classes as the old renderer (full-width via your CSS)
  table(field, value) {
    const v = resolveValue(field, value);
    const rows = Array.isArray(v) ? v : [];
    const columns = field.options || [];

    const wrap = makeContainer("div", "table-wrapper");
    wrap.classList.add("inner-dnd");
    wrap.dataset.type = "table";
    wrap.dataset.tableField = field.key;

    const loopChain = Array.isArray(field.loopKey)
      ? field.loopKey.join(".")
      : field.loopKey || "root";
    const scope = `table:${field.key}:${loopChain}:${crypto
      .randomUUID()
      .slice(0, 8)}`;
    wrap.dataset.dndScope = scope;

    const table = document.createElement("table");
    table.className = "dynamic-table";
    wrap.appendChild(table);

    // header
    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    thead.appendChild(trh);
    table.appendChild(thead);

    // drag col
    trh.appendChild(document.createElement("th"));

    // column headers
    for (const col of columns) {
      const { label } = resolveOption(col);
      const th = document.createElement("th");
      th.textContent = String(label ?? "");
      trh.appendChild(th);
    }

    // remove col
    trh.appendChild(document.createElement("th"));

    // body
    const tbody = document.createElement("tbody");
    tbody.dataset.dndScope = scope;
    table.appendChild(tbody);

    function addRow(vals = []) {
      const tr = document.createElement("tr");

      // drag handle
      const dragTd = document.createElement("td");
      const grab = document.createElement("span");
      grab.textContent = "↕";
      grab.className = "drag-handle row-handle";
      dragTd.appendChild(grab);
      tr.appendChild(dragTd);

      // cells
      columns.forEach((c, i) => {
        const { value: name } = resolveOption(c);
        const td = document.createElement("td");
        const inp = document.createElement("input");
        inp.type = "text";
        inp.name = String(name ?? "");
        inp.value = String(vals[i] ?? "");
        td.appendChild(inp);
        tr.appendChild(td);
      });

      // remove
      const remTd = document.createElement("td");
      const rem = document.createElement("button");
      rem.type = "button";
      rem.textContent = "−";
      rem.className = "remove-btn";
      rem.onclick = () => tr.remove();
      remTd.appendChild(rem);
      tr.appendChild(remTd);

      tbody.appendChild(tr);
    }

    (rows || []).forEach(addRow);

    const add = document.createElement("button");
    add.type = "button";
    add.textContent = "+";
    add.onclick = () => addRow([]);

    wrap.appendChild(add);

    return wrap;
  },

  // file: picker UI (text input + button) with OS dialog + onSave hook
  file(field, value) {
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

    return element;
  },

  // directory: use webkitdirectory (works in Chromium/Electron)
  directory(field, value) {
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

    return element;
  },

  // password: input + reveal/hide toggle (same DOM/classes as old renderer)
  password(field, value) {
    const v = value ?? field?.default ?? "";

    const wrapper = document.createElement("div");
    wrapper.className = "input-with-button password-field-wrapper";

    const input = document.createElement("input");
    input.type = "password";
    input.name = field?.key || "password";
    input.value = String(v);
    input.className = "input";

    // Reveal/hide toggle
    const toggleBtn = createIconButton({
      iconClass: "fa fa-eye",
      className: "toggle-password-btn",
      ariaLabel: "Show/hide password",
      onClick: () => {
        input.type = input.type === "password" ? "text" : "password";
        const icon = toggleBtn.querySelector("i");
        if (icon)
          icon.className =
            input.type === "password" ? "fa fa-eye" : "fa fa-eye-slash";
      },
    });

    wrapper.appendChild(input);
    wrapper.appendChild(toggleBtn);

    return wrapper;
  },
};

// ─────────────────────────────────────────────
// Public API
// createFieldDOM: pick the blueprint by field.type, construct the DOM.
// Fallback: text. Skips unsupported types explicitly.
const EXCLUDED = new Set([
  "api",
  "code",
  "guid",
  "image",
  "latex",
  "loopstart",
  "loopstop",
  "link",
  "tags",
]);

export function createFieldDOM(field, value) {
  if (!field || !field.type) {
    // fallback to text if malformed definition
    return FieldBlueprints.text({ key: "text" }, value);
  }
  const type = String(field.type).toLowerCase();
  if (EXCLUDED.has(type)) {
    throw new Error(`Type "${type}" is excluded from blueprints.`);
  }
  const ctor = FieldBlueprints[type] || FieldBlueprints.text;
  return ctor(field, value);
}
