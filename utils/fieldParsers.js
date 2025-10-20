// utils/fieldParsers.js

import { EventBus } from "../modules/eventBus.js";
import { ensureVirtualLocation } from "./vfsUtils.js";
import { generateGuid } from "./domUtils.js";

// GUID
export const parseGuidField = async function (input) {
  return input?.value?.trim() || generateGuid();
};

// Text
export const parseTextField = async function (input) {
  return input.value.trim();
};

// Boolean
export const parseBooleanField = async function (wrapper) {
  if (!wrapper) {
    EventBus.emit("logging:warning", ["[parseBooleanField] Wrapper is null"]);
    return false;
  }

  const input = wrapper.querySelector(`input[type="checkbox"]`);
  if (!input) {
    EventBus.emit("logging:warning", [
      "[parseBooleanField] Checkbox not found",
    ]);
    return false;
  }

  return input.checked === true;
};

// Dropdown
export const parseDropdownField = async function (input) {
  return input.value;
};

// Multi-option
export const parseMultiOptionField = async function (wrapper) {
  return Array.from(
    wrapper.querySelectorAll(`input[type="checkbox"]:checked`)
  ).map((el) => el.value);
};

// Radio
export const parseRadioField = async function (wrapper) {
  const selected = wrapper.querySelector(
    `input[name="${wrapper.dataset.radioGroup}"]:checked`
  );
  return selected?.value || "";
};

// Textarea
export async function parseTextareaField(el, template) {
  try {
    // Zoek de juiste key — uit EasyMDE of uit fallback
    const key =
      el?.dataset?.fieldKey ||
      el?.getAttribute?.("name") ||
      el?.querySelector?.("textarea")?.getAttribute?.("name") ||
      el?.closest?.("textarea")?.getAttribute?.("name");

    const instance = window.easyMDEInstances?.[key];
    if (instance && typeof instance.value === "function") {
      return instance.value().trim();
    }

    // fallback
    const fallback =
      el?.tagName === "TEXTAREA" ? el : el?.querySelector?.("textarea");
    return fallback?.value?.trim?.() || "";
  } catch (err) {
    EventBus.emit("logging:error", [`[parseTextareaField] ${err.message}`]);
    return "";
  }
}

// Number
export const parseNumberField = async function (input) {
  return parseFloat(input.value) || 0;
};

// Range
export const parseRangeField = async function (wrapper) {
  const input = wrapper.querySelector(`input[type="range"]`);
  if (!input) return 0;
  return parseFloat(input.value) || 0;
};

// Date
export const parseDateField = async function (input) {
  return input.value;
};

// List
export const parseListField = async function (wrapper) {
  const items = Array.from(wrapper.querySelectorAll('input[type="text"]'));
  return items.map((input) => input.value.trim()).filter(Boolean);
};

// Table
export const parseTableField = async function (wrapper) {
  const table = wrapper.querySelector("table");
  if (!table) return [];

  const data = [];
  const rows = table.querySelectorAll("tbody tr");
  rows.forEach((tr) => {
    const row = Array.from(tr.querySelectorAll("td input")).map((input) =>
      input.value.trim()
    );
    if (row.some((cell) => cell !== "")) {
      data.push(row);
    }
  });

  return data;
};

// Image
export const parseImageField = async function (inputWrapper, template) {
  template = await ensureVirtualLocation(template);

  if (!inputWrapper || !template?.virtualLocation) return "";

  const fileInput = inputWrapper.querySelector("input[type='file']");
  const file = fileInput?.files?.[0];

  if (!file) {
    const existing = inputWrapper.getAttribute("data-filename");
    return existing?.trim() || "";
  }

  const allowedTypes = ["image/png", "image/jpeg"];
  if (!allowedTypes.includes(file.type)) return "";

  try {
    const buffer = await file.arrayBuffer();
    const filename = file.name;

    const result = await EventBus.emitWithResponse("form:saveImage", {
      virtualLocation: template.virtualLocation,
      filename,
      buffer: Array.from(new Uint8Array(buffer)),
    });

    if (result?.success) {
      inputWrapper.setAttribute("data-filename", filename);
      return filename;
    } else {
      console.error("Failed to save image:", result?.error);
      return "";
    }
  } catch (err) {
    console.error("parseImageField failed:", err);
    return "";
  }
};

// Link
export const parseLinkField = async function (wrapper, template, field) {
  const key = field.key;
  const hidden = wrapper.querySelector(`input[type="hidden"][name="${key}"]`);
  if (!hidden) {
    EventBus.emit("logging:warning", [
      `[parseLinkField] Hidden input not found for link field "${key}"`,
    ]);
    return "";
  }

  const raw = hidden.value?.trim() ?? "";
  if (!raw) return ""; // empty link stays empty

  // Prefer the new JSON shape; fall back to legacy string
  try {
    const obj = JSON.parse(raw);
    const href = typeof obj?.href === "string" ? obj.href.trim() : "";
    const text = typeof obj?.text === "string" ? obj.text.trim() : "";
    return href || text ? { href, text } : "";
  } catch {
    // Legacy: hidden contained a plain string (href only)
    const href = raw;
    return href ? { href, text: "" } : "";
  }
};

// Tags
export const parseTagsField = async function (wrapper) {
  const tags = Array.from(wrapper.querySelectorAll(".tag-item"))
    .map((el) => el.firstChild?.textContent?.trim())
    .filter(Boolean);
  return tags;
};

// Code (Programmable)
export function parseCodeField(wrapper) {
  if (!wrapper) return null;
  const key = wrapper.dataset?.codeField || wrapper.dataset?.fieldKey || "";
  const hidden =
    wrapper.querySelector(`input[type="hidden"][name="${key}"]`) ||
    wrapper.querySelector(`input[type="hidden"]`);
  if (!hidden) return null;

  const raw = String(hidden.value ?? "");
  if (raw === "") return ""; // keep empty as empty
  if (hidden.dataset?.valueEncoding === "json") {
    try {
      return JSON.parse(raw);
    } catch {
      /* fall through */
    }
  }
  return raw;
}

// latex (hidden) — always persist the template default
export const parseLatexField = async function (_wrapper, _template, field) {
  // Normalize to a plain string, keep whitespace, normalize newlines if you like
  const v = String(field?.default ?? "");
  return v.replace(/\r\n?/g, "\n");
};

// API
export const parseApiField = async function (wrapper, _template, field) {
  if (!wrapper) return {};
  const hidden = wrapper.querySelector('input[type="hidden"]');
  if (!hidden) return {};

  // hidden holds { id, overrides } (kept in sync by renderApiField)
  let id = "";
  let overrides = {};
  try {
    const obj = JSON.parse(hidden.value || "{}");
    id = typeof obj.id === "string" ? obj.id : "";
    overrides = (obj && typeof obj.overrides === "object" && obj.overrides) || {};
  } catch {
    id = hidden.value?.trim?.() || "";
  }

  // no id → nothing to fetch; persist empty object
  if (!id) return {};

  // fetch the remote document through the router
  let doc = {};
  try {
    const res = await EventBus.emitWithResponse("api:get", {
      collection: String(field.collection || ""),
      id,
    });
    if (res?.ok) doc = res.data || {};
  } catch {
    // swallow; leave doc = {}
  }

  // build the snapshot we will SAVE
  const mappings = Array.isArray(field.map) ? field.map : [];
  if (mappings.length === 0) {
    // no mapping → save whole doc plus id
    return { id, ...doc };
  }

  // mapped snapshot (editable uses overrides if present)
  const out = { id };
  for (const m of mappings) {
    const apiVal = (m.path || "")
      .split(".")
      .filter(Boolean)
      .reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), doc);

    out[m.key] = m.mode === "editable" && overrides.hasOwnProperty(m.key)
      ? overrides[m.key]
      : apiVal ?? null;
  }

  return out;
};