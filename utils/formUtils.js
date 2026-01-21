// utils/formUtils.js

import { EventBus } from "../modules/eventBus.js";
import { fieldTypes, getFieldTypeDef } from "./fieldTypes.js";
import { t } from "./i18n.js";

// ─────────────────────────────────────────────
// Default value normalizer (type-aware)
// ─────────────────────────────────────────────
export function normalizeDefaultValue(field, rawDefault) {
  const type = field.type;

  if (rawDefault == null) {
    const defFn = fieldTypes[type]?.defaultValue;
    return typeof defFn === "function" ? defFn() : null;
  }

  try {
    switch (type) {
      case "boolean":
        return String(rawDefault).toLowerCase() === "true";

      case "number":
        return isNaN(Number(rawDefault)) ? null : Number(rawDefault);

      case "link":
        if (typeof rawDefault === "string") {
          try {
            return JSON.parse(rawDefault);
          } catch {
            return { href: rawDefault, text: rawDefault };
          }
        }
        if (typeof rawDefault === "object" && rawDefault !== null) {
          return {
            href: rawDefault.href ?? "",
            text: rawDefault.text ?? "",
          };
        }
        return { href: "", text: "" };

      default:
        return typeof rawDefault === "string" ? rawDefault.trim() : rawDefault;
    }
  } catch (err) {
    EventBus.emit("logging:warning", [
      `[normalizeDefaultValue] Failed for type=${type}, value=${rawDefault}: ${err.message}`,
    ]);
    return null;
  }
}

// ─────────────────────────────────────────────
// Extract field definition from edit modal
// ─────────────────────────────────────────────
export function extractFieldDefinition({
  keyId = "edit-key",
  summaryDropdown,
  expressionItemId = "edit-expression-item",
  twoColumnId = "edit-two-column",
  labelId = "edit-label",
  descriptionId = "edit-description",
  defaultId = "edit-default",
  typeDropdown,
  optionsId = "edit-options",
}) {
  const key = document.getElementById(keyId)?.value.trim();
  const summaryField = summaryDropdown?.getSelected() || "";
  const expressionItem =
    document.getElementById(expressionItemId)?.checked || false;
  const twoColumn = document.getElementById(twoColumnId)?.checked || false;
  const label = document.getElementById(labelId)?.value.trim();
  const description = document.getElementById(descriptionId)?.value.trim();
  const rawDef = document.getElementById(defaultId)?.value;
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

  // Enforce exactly two boolean options
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
    if (!normalized.true) normalized.true = { value: true, label: "True" };
    if (!normalized.false) normalized.false = { value: false, label: "False" };
    options = [normalized.true, normalized.false];
  }

  const field = { key, label, type };
  if (rawDef !== undefined && rawDef !== "") {
    field.default = normalizeDefaultValue(field, rawDef);
  }
  if (summaryField) field.summary_field = summaryField;
  if (expressionItem) field.expression_item = true;
  if (twoColumn) field.two_column = true;
  if (description) field.description = description;
  if (options.length > 0) field.options = options;

  return field;
}

// ─────────────────────────────────────────────
// Build shadow data
// ─────────────────────────────────────────────
export function buildShadowData(fields, rawData = {}) {
  const data = rawData.data || rawData;
  const structuredData = {};
  let i = 0;

  while (i < fields.length) {
    const field = fields[i];

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

    // regular field
    structuredData[field.key] =
      data[field.key] ?? normalizeDefaultValue(field, field.default);
    i++;
  }
  return structuredData;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
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
  const { key, type, guid } = field;
  const loopKey = Array.isArray(field.loopKey)
    ? field.loopKey.join(".")
    : field.loopKey;

  if (!container || typeof container.querySelector !== "function") {
    console.warn(`[resolveFieldElement] ⚠️ Invalid container provided.`);
    return null;
  }

  // If guid is provided, use it for precise targeting (most specific)
  if (guid) {
    const el = container.querySelector(`[data-field-guid="${guid}"]`);
    if (el) return el;
  }

  // Fallback to the existing key-based resolution
  const selectorParts = [`[data-field-key="${key}"]`];
  if (type) selectorParts.push(`[data-field-type="${type}"]`);
  if (loopKey) selectorParts.push(`[data-field-loop="${loopKey}"]`);
  return container.querySelector(selectorParts.join(""));
}

/**
 * Resolve field element by GUID (most precise method)
 * @param {HTMLElement} container - The container to search within
 * @param {string} guid - The unique GUID of the field
 * @returns {HTMLElement|null} - The field element or null
 */
export function resolveFieldByGuid(container, guid) {
  if (!container || !guid) return null;
  return container.querySelector(`[data-field-guid="${guid}"]`);
}

// ─────────────────────────────────────────────
// Form data collection
// ─────────────────────────────────────────────
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
      `[parseFieldValue] Element not found for field "${field.key}"`,
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
        if (value !== undefined) result[field.key] = value;
        i++;
      }
    }
    return result;
  }

  const data = await collectData(fields, container);
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

// ─────────────────────────────────────────────
// Default injection
// ─────────────────────────────────────────────
export function createLoopDefaults(group) {
  const entry = {};
  for (const f of group) {
    entry[f.key] = normalizeDefaultValue(f, f.default);
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
          if (!(key in entry)) {
            entry[key] = normalizeDefaultValue(f, f.default);
          }
        });
      });
      group.forEach((f) => delete metaData[f.key]);
    } else {
      const key = field.key;
      if (!(key in metaData)) {
        metaData[key] = normalizeDefaultValue(field, field.default);
      }
      i++;
    }
  }
}

// ─────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────
export function applyFieldAttributeDisabling(dom, fieldTypeKey) {
  const typeDef = getFieldTypeDef(fieldTypeKey);
  const disabled = new Set(typeDef.disabledAttributes || []);
  Object.entries(dom).forEach(([key, el]) => {
    if (!el || !(el instanceof Element)) return;
    let container;
    if (
      el.classList?.contains("modal-form-row") ||
      el.classList?.contains("switch-row")
    ) {
      container = el;
    } else {
      container = el.closest?.(".modal-form-row, .switch-row");
    }
    if (!container) return;
    container.style.display = disabled.has(key) ? "none" : "";
  });
}

export function clearContainerUI(
  container,
  labelKey = null,
  fallback = "Select or create an item to begin."
) {
  const label = typeof labelKey === "string" ? t(labelKey, fallback) : fallback;
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
