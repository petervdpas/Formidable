// utils/formUtils.js

import { EventBus } from "../modules/eventBus.js";
import { fieldTypes } from "./fieldTypes.js";
import { capitalize } from "./stringUtils.js";
import * as renderers from "./fieldRenderers.js";

export function extractFieldDefinition({
  keyId = "edit-key",
  twoColumnId = "edit-two-column",
  labelId = "edit-label",
  descriptionId = "edit-description",
  defaultId = "edit-default",
  typeDropdown,
  optionsId = "edit-options",
}) {
  const key = document.getElementById(keyId)?.value.trim();
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
  if (description) field.description = description;
  if (twoColumn) field.two_column = true;
  if (options.length > 0) field.options = options;

  return field;
}

function resolveFieldElement(container, field) {
  switch (field.type) {
    case "range":
      return container.querySelector(`[data-range-field="${field.key}"]`);
    case "radio":
      return container.querySelector(`[data-radio-group="${field.key}"]`);
    case "multioption":
      return container.querySelector(`[data-multioption-field="${field.key}"]`);
    case "list":
      return container.querySelector(`[data-list-field="${field.key}"]`);
    case "table":
      return container.querySelector(`[data-table-field="${field.key}"]`);
    case "image":
      return container.querySelector(`[data-image-field="${field.key}"]`);
    default:
      return container.querySelector(`[name="${field.key}"]`);
  }
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
          const def = fieldTypes[f.type];
          if (!def || typeof def.parseValue !== "function") continue;

          const el = resolveFieldElement(item, f);
          if (!el) continue;

          entry[f.key] = await def.parseValue(el, template);
        }
        loopValues.push(entry);
      }

      data[loopKey] = loopValues;
    } else {
      const typeDef = fieldTypes[field.type];
      if (!typeDef || typeof typeDef.parseValue !== "function") {
        EventBus.emit("logging:warning", [
          `[getFormData] No parser for field type: ${field.type}`,
        ]);
        i++;
        continue;
      }

      const el = resolveFieldElement(container, field);
      if (!el) {
        EventBus.emit("logging:warning", [
          `[getFormData] Missing input for: ${field.key}`,
        ]);
        i++;
        continue;
      }

      data[field.key] = await typeDef.parseValue(el, template);
      i++;
    }
  }

  // Read hidden inputs for _filename and flagged
  const filenameInput = container.querySelector("#meta-json-filename");
  if (filenameInput) {
    meta._filename = filenameInput.value.trim();
  }

  const flaggedInput = container.querySelector("#meta-flagged");
  if (flaggedInput) {
    meta.flagged = flaggedInput.value === "true";
  }

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

    // Handle custom row overrides like `twoColumnRow`
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

export function clearFormUI(
  container,
  label = "Select or create a data-file to begin."
) {
  container.innerHTML = `<p>${label}</p>`;
  EventBus.emit("logging:default", ["[clearFormUI] Form UI cleared."]);
}

export function stripMarkdownExtension(filename = "") {
  return filename.replace(/\.md$/, "");
}

export function validateFilenameInput(inputEl) {
  const name = inputEl?.value.trim();
  return name || null;
}

export async function renderFieldElement(field, template = null) {
  const type = field.type;
  const fn = renderers[`render${capitalize(type)}Field`];
  const typeDef = fieldTypes[type];

  if (!fn || !typeDef) {
    EventBus.emit("logging:default", [
      `[renderFieldElement] No renderer found for type: ${type}`,
    ]);
    return null;
  }

  // Ensure default is set if not explicitly provided
  if (!Object.prototype.hasOwnProperty.call(field, "default")) {
    field.default = typeDef.defaultValue();
  }

  return await fn(field, template);
}
