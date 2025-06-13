// utils/fieldParsers.js

import { ensureVirtualLocation } from "./vfsUtils.js";

// Text
export function parseTextField(input) {
  return input.value.trim();
}

// Boolean
export function parseBooleanField(input) {
  return input.checked;
}

// Dropdown
export function parseDropdownField(input) {
  return input.value;
}

// Radio
export function parseRadioField(wrapper) {
  const selected = wrapper.querySelector(
    `input[name="${wrapper.dataset.radioGroup}"]:checked`
  );
  return selected?.value || "";
}

// Textarea
export function parseTextareaField(input) {
  return input.value.trim();
}

// Number
export function parseNumberField(input) {
  return parseFloat(input.value) || 0;
}

// Range
export function parseRangeField(wrapper) {
  const input = wrapper.querySelector(`input[type="range"]`);
  if (!input) return 0;
  return parseFloat(input.value) || 0;
}

// Date
export function parseDateField(input) {
  return input.value;
}

// List
export function parseListField(wrapper) {
  const items = Array.from(wrapper.querySelectorAll('input[type="text"]'));
  return items.map((input) => input.value.trim()).filter(Boolean);
}

// Table
export function parseTableField(wrapper) {
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
}

// Image
export async function parseImageField(inputWrapper, template) {
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
}
