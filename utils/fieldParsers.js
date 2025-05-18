// utils/fieldParsers.js

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
