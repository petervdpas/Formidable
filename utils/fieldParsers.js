// utils/fieldParsers.js

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
    EventBus.emit("logging:warning", ["[parseBooleanField] Checkbox not found"]);
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
    const fallback = el?.tagName === "TEXTAREA" ? el : el?.querySelector?.("textarea");
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

  console.log(`[parseLinkField] wrapper.innerHTML =`, wrapper.innerHTML);
  
  const key = field.key;
  const hidden = wrapper.querySelector(`input[type="hidden"][name="${key}"]`);
  if (!hidden) {
    EventBus.emit("logging:warning", [
      `[parseLinkField] Hidden input not found for link field "${key}"`,
    ]);
    return "";
  }

  return hidden.value?.trim() || "";
};