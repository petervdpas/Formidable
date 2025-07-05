// utils/formUtils.js

import { EventBus } from "../modules/eventBus.js";
import { fieldTypes } from "./fieldTypes.js";

export function createFieldManager({
  container,
  fields = [],
  data = {},
  renderField,
  beforeEach = null,
  afterEach = null,
  clear = true,
  injectBefore = null,
  injectAfter = null,
}) {
  if (!container) {
    EventBus.emit("logging:error", ["[FieldManager] container is null"]);
    throw new Error("FieldManager container is required.");
  }

  if (typeof renderField !== "function") {
    throw new Error("renderField must be a function");
  }

  async function renderFields() {
    if (clear) container.innerHTML = "";

    if (typeof injectBefore === "function") {
      const beforeEl = await injectBefore(container);
      if (beforeEl instanceof HTMLElement) {
        container.appendChild(beforeEl);
      } else if (Array.isArray(beforeEl)) {
        for (const el of beforeEl) {
          if (el instanceof HTMLElement) container.appendChild(el);
        }
      }
    }

    for (const field of fields) {
      if (typeof beforeEach === "function") {
        await beforeEach(field);
      }

      const value = data[field.key];
      const node = await renderField(field, value);
      if (node instanceof HTMLElement) {
        container.appendChild(node);
      }

      if (typeof afterEach === "function") {
        await afterEach(field);
      }
    }

    if (typeof injectAfter === "function") {
      const afterEl = await injectAfter(container);
      if (afterEl instanceof HTMLElement) {
        container.appendChild(afterEl);
      } else if (Array.isArray(afterEl)) {
        for (const el of afterEl) {
          if (el instanceof HTMLElement) container.appendChild(el);
        }
      }
    }

    EventBus.emit("logging:default", [
      `[FieldManager] Rendered ${fields.length} field(s).`,
    ]);
  }

  return {
    renderFields,
  };
}

export function extractFieldDefinition({
  keyId = "edit-key",
  sidebarItemId = "edit-sidebar-item",
  twoColumnId = "edit-two-column",
  labelId = "edit-label",
  descriptionId = "edit-description",
  defaultId = "edit-default",
  typeDropdown,
  optionsId = "edit-options",
}) {
  const key = document.getElementById(keyId)?.value.trim();
  const sidebarItem = document.getElementById(sidebarItemId)?.checked || false;
  const twoColumn = document.getElementById(twoColumnId)?.checked || false;
  const label = document.getElementById(labelId)?.value.trim();
  const description = document.getElementById(descriptionId)?.value.trim();
  const def = document.getElementById(defaultId)?.value.trim();
  const type = typeDropdown?.getSelected() || "text";

  let optionsRaw = document.getElementById(optionsId)?.value.trim();
  let options = [];

  if (optionsRaw) {
    try {
      const parsed = JSON.parse(optionsRaw);
      if (Array.isArray(parsed)) {
        options = parsed;
      } else {
        throw new Error("Parsed options is not an array.");
      }
    } catch (err) {
      EventBus.emit("logging:warning", [
        `[extractFieldDefinition] Failed to parse options JSON: ${err.message}`,
      ]);
    }
  }

  // Enforce exactly two boolean options: true and false
  if (type === "boolean") {
    const normalized = { true: null, false: null };

    for (const opt of options) {
      const val = typeof opt === "object" && opt !== null ? opt.value : opt;
      const strVal = String(val).toLowerCase();

      if (strVal === "true") {
        normalized.true = {
          value: true,
          label: typeof opt === "object" && opt.label ? opt.label : "On",
        };
      } else if (strVal === "false") {
        normalized.false = {
          value: false,
          label: typeof opt === "object" && opt.label ? opt.label : "Off",
        };
      }
    }

    // Fill in missing options
    if (!normalized.true) {
      normalized.true = { value: true, label: "True" };
    }
    if (!normalized.false) {
      normalized.false = { value: false, label: "False" };
    }

    options = [normalized.true, normalized.false];
  }

  const field = { key, label, type };
  if (def) field.default = def;
  if (sidebarItem) field.sidebar_item = true;
  if (twoColumn) field.two_column = true;
  if (description) field.description = description;
  if (options.length > 0) field.options = options;

  return field;
}

export function collectLoopGroup(fields, startIdx, loopKey) {
  const group = [];
  let i = startIdx;
  while (
    i < fields.length &&
    !(fields[i].type === "loopstop" && fields[i].key === loopKey)
  ) {
    group.push(fields[i]);
    i++;
  }
  return { group, stopIdx: i };
}

function resolveFieldElement(container, field) {
  const { key, type, loopKey } = field;
  const attr = fieldTypes[type]?.selectorAttr;

  if (!attr) {
    // Fallback to default selector
    let sel = `[data-field-key="${key}"]`;
    if (loopKey) sel += `[data-field-loop="${loopKey}"]`;
    return container.querySelector(sel) || null;
  }

  // Use specific selector attribute
  let sel = `[${attr}="${key}"]`;
  if (loopKey) sel += `[data-field-loop="${loopKey}"]`;

  const el =
    container.querySelector(sel) ||
    container.querySelector(`[${attr}="${key}"]`) ||
    container.querySelector(`[data-field-key="${key}"]`) ||
    container.querySelector(`[name="${key}"]`);

  if (!el) {
    EventBus.emit("logging:warning", [
      `[resolveFieldElement] Element not found for key="${key}", type="${type}"`,
    ]);
  }

  // Fallback for EasyMDE
  if (
    el?.classList?.contains("EasyMDEContainer") ||
    el?.querySelector?.(".editor-toolbar")
  ) {
    const textarea = el.querySelector("textarea");
    if (textarea) return textarea;
  }

  return el;
}

async function parseFieldValue(container, field, template) {
  const def = fieldTypes[field.type];
  if (!def || typeof def.parseValue !== "function") {
    EventBus.emit("logging:warning", [
      `[parseFieldValue] No parseValue function found for type="${field.type}"`,
    ]);
    return undefined;
  }

  const el = resolveFieldElement(container, {
    key: field.key,
    type: field.type,
    loopKey: field.loopKey,
  });

  if (!el) {
    EventBus.emit("logging:warning", [
      `[parseFieldValue] No DOM element found for key="${field.key}", type="${field.type}".`,
    ]);
    return undefined;
  }

  try {
    return await def.parseValue(el, template);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[parseFieldValue] Error parsing field "${field.key}": ${err.message}`,
    ]);
    return undefined;
  }
}

export async function getFormData(container, template) {
  const data = {};
  const meta = {};
  const fields = template.fields || [];

  let i = 0;
  while (i < fields.length) {
    const field = fields[i];

    if (field.type === "loopstart") {
      const loopKey = field.key;
      const { group, stopIdx } = collectLoopGroup(fields, i + 1, loopKey);
      i = stopIdx + 1;

      const loopItems = container.querySelectorAll(
        `.loop-container[data-loop-key="${loopKey}"] .loop-item`
      );

      const loopValues = [];
      for (const item of loopItems) {
        const entry = {};
        for (const f of group) {
          const scoped = { ...f, loopKey };
          const value = await parseFieldValue(item, scoped, template);
          if (value !== undefined) entry[f.key] = value;
        }

        const hasValues = Object.values(entry).some((v) => {
          if (Array.isArray(v)) return v.length > 0;
          if (v && typeof v === "object") return Object.keys(v).length > 0;
          return v !== undefined && v !== null && v !== "";
        });

        if (hasValues) {
          loopValues.push(entry);
        }
      }

      data[loopKey] = loopValues;
    } else {
      const value = await parseFieldValue(container, field, template);
      if (value !== undefined) {
        data[field.key] = value;
      }
      i++;
    }
  }

  // Metadata extraction
  const filenameInput = container.querySelector("#meta-json-filename");
  if (filenameInput) meta._filename = filenameInput.value.trim();

  const flaggedInput = container.querySelector("#meta-flagged");
  if (flaggedInput) meta.flagged = flaggedInput.value === "true";

  EventBus.emit("logging:default", [
    "[getFormData] Collected form data:",
    { data, meta },
  ]);

  return { data, meta };
}

export function createLoopDefaults(group) {
  const entry = {};
  for (const f of group) {
    const defFn = fieldTypes[f.type]?.defaultValue;
    entry[f.key] = f.hasOwnProperty("default")
      ? f.default
      : typeof defFn === "function"
      ? defFn()
      : undefined;
  }
  return entry;
}

export function injectFieldDefaults(fields, metaData) {
  let i = 0;

  while (i < fields.length) {
    const field = fields[i];

    if (field.type === "loopstart") {
      const loopKey = field.key;
      const { group, stopIdx } = collectLoopGroup(fields, i + 1, loopKey);
      i = stopIdx + 1;

      if (!Array.isArray(metaData[loopKey])) {
        metaData[loopKey] = [createLoopDefaults(group)];
      }

      metaData[loopKey].forEach((entry) => {
        group.forEach((f) => {
          const key = f.key;
          const defFn = fieldTypes[f.type]?.defaultValue;
          if (!(key in entry)) {
            entry[key] = f.hasOwnProperty("default")
              ? f.default
              : typeof defFn === "function"
              ? defFn()
              : undefined;
          }
        });
      });

      group.forEach((f) => delete metaData[f.key]);
    } else {
      const key = field.key;
      const defFn = fieldTypes[field.type]?.defaultValue;

      if (!(key in metaData)) {
        metaData[key] = field.hasOwnProperty("default")
          ? field.default
          : typeof defFn === "function"
          ? defFn()
          : undefined;
      }

      i++;
    }
  }
}

export function applyFieldAttributeDisabling(dom, fieldTypeKey) {
  const typeDef = fieldTypes[fieldTypeKey];
  const disabled = new Set(typeDef?.disabledAttributes || []);

  Object.entries(dom).forEach(([key, el]) => {
    if (!el) return;

    const container =
      el.classList.contains("modal-form-row") ||
      el.classList.contains("switch-row")
        ? el
        : el.closest(".modal-form-row") || el.closest(".switch-row");

    if (disabled.has(key)) {
      if (container) container.style.display = "none";
    } else {
      if (container) container.style.display = "";
    }
  });
}
export function clearContainerUI(
  container,
  label = "Select or create a form-file to begin."
) {
  container.innerHTML = `<p class="clearform-message">${label}</p>`;
  EventBus.emit("logging:default", ["[clearContainerUI] Form UI cleared."]);
}

export function stripMarkdownExtension(filename = "") {
  return filename.replace(/\.md$/, "");
}

export function validateFilenameInput(inputEl) {
  const name = inputEl?.value.trim();
  return name || null;
}
