// utils/formUtils.js

import { EventBus } from "../modules/eventBus.js";
import { fieldTypes } from "./fieldTypes.js";

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

export function buildShadowData(fields, rawData = {}) {
  const data = rawData.data || rawData;
  const structuredData = {};
  let i = 0;

  while (i < fields.length) {
    const field = fields[i];

    // ───────────────────────────────
    // Loop handling
    // ───────────────────────────────
    if (field.type === "loopstart") {
      const loopKey = field.key;
      const { group, stopIdx } = collectLoopGroup(fields, i + 1, loopKey);

      const rawItems = Array.isArray(data[loopKey]) ? data[loopKey] : [];

      structuredData[loopKey] = rawItems.map((itemData) =>
        buildShadowData(group, itemData)
      );

      i = stopIdx + 1;
      continue;
    }

    // ───────────────────────────────
    // Regular field
    // ───────────────────────────────
    structuredData[field.key] = data[field.key] ?? field.default ?? null;
    i++;
  }

  return structuredData;
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

export function resolveFieldElement(container, field) {
  const { key, type } = field;
  const loopKey = Array.isArray(field.loopKey)
    ? field.loopKey.join(".")
    : field.loopKey;

  if (!container || typeof container.querySelector !== "function") {
    console.warn(`[resolveFieldElement] ⚠️ Invalid container provided.`);
    return null;
  }

  const selectorParts = [`[data-field-key="${key}"]`];

  if (type) selectorParts.push(`[data-field-type="${type}"]`);
  if (loopKey) selectorParts.push(`[data-field-loop="${loopKey}"]`);

  const selector = selectorParts.join("");

  const el = container.querySelector(selector);

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
      `[parseFieldValue] Element not found for field "${field.key}" of type "${field.type}" with loopKey "${field.loopKey}"`,
    ]);
    return undefined;
  }

  try {
    return await def.parseValue(el, template, field);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[parseFieldValue] Error parsing field "${field.key}": ${err.message}`,
    ]);
    return undefined;
  }
}

export async function getFormData(container, template) {
  const fields = template.fields || [];
  const meta = {};

  async function collectData(fields, container, parentLoopKeyChain = []) {
    const result = {};
    let i = 0;

    while (i < fields.length) {
      const field = fields[i];

      if (field.type === "loopstart") {
        const loopKey = field.key;
        const { group, stopIdx } = collectLoopGroup(fields, i + 1, loopKey);
        i = stopIdx + 1;

        const selector = `.loop-container[data-loop-key="${loopKey}"] .loop-item`;
        const loopItems = container.querySelectorAll(selector);
        const loopValues = [];

        for (const item of loopItems) {
          const entry = await collectData(group, item, [
            ...parentLoopKeyChain,
            loopKey,
          ]);

          const hasValues = Object.values(entry).some((v) => {
            if (Array.isArray(v)) return v.length > 0;
            if (v && typeof v === "object") return Object.keys(v).length > 0;
            return v !== undefined && v !== null && v !== "";
          });

          if (hasValues) loopValues.push(entry);
        }

        result[loopKey] = loopValues;
      } else {
        const scopedField = { ...field, loopKey: parentLoopKeyChain };
        const value = await parseFieldValue(container, scopedField, template);
        if (value !== undefined) {
          result[field.key] = value;
        }
        i++;
      }
    }

    return result;
  }

  const data = await collectData(fields, container);

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
