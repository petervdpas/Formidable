// utils/fieldAppliers.js

import { EventBus } from "../modules/eventBus.js";

export function applyListField(container, key, value) {
  const listWrapper = container.querySelector(`[data-list-field="${key}"]`);
  if (!listWrapper) return;

  const addButton = listWrapper.querySelector("button");
  const existingItems = listWrapper.querySelectorAll('div input[type="text"]');
  existingItems.forEach((el) => el.parentElement.remove());

  (value || []).forEach((item) => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = item;

    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.marginBottom = "6px";

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "-";
    removeBtn.style.marginLeft = "6px";
    removeBtn.onclick = () => wrapper.remove();

    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);

    listWrapper.insertBefore(wrapper, addButton);
  });
}

export function applyTableField(container, key, value) {
  const tableWrapper = container.querySelector(`[data-table-field="${key}"]`);
  if (!tableWrapper || !Array.isArray(value)) return;

  const tbody = tableWrapper.querySelector("tbody");
  tbody.innerHTML = "";

  value.forEach((row) => {
    const tr = document.createElement("tr");

    row.forEach((cellValue) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.value = cellValue;
      td.appendChild(input);
      tr.appendChild(td);
    });

    const tdRemove = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "-";
    removeBtn.className = "remove-btn";
    removeBtn.onclick = () => tr.remove();
    tdRemove.appendChild(removeBtn);
    tr.appendChild(tdRemove);

    tbody.appendChild(tr);
  });
}

export function applyMultioptionField(container, key, value) {
  const wrapper = container.querySelector(`[data-multioption-field="${key}"]`);
  if (!wrapper || !Array.isArray(value)) return;

  const checkboxes = wrapper.querySelectorAll(`input[type="checkbox"]`);
  checkboxes.forEach((cb) => {
    cb.checked = value.includes(cb.value);
  });
}

export function applyGenericField(input, key, value) {
  if (!input) {
    EventBus.emit("logging:warning", [
      `[applyGenericField] Missing input for key "${key}".`,
    ]);
    return;
  }

  // 🩹 Handle radio groups
  if (input.dataset?.radioGroup === key) {
    const radios = input.querySelectorAll(`input[type="radio"]`);
    radios.forEach((el) => {
      el.checked = String(el.value) === String(value);
    });
    return;
  }

  if (input.type === "checkbox") {
    input.checked = value === true;
  } else if ("value" in input) {
    input.value = value ?? "";
  } else {
    EventBus.emit("logging:warning", [
      `[applyGenericField] Unsupported input for key "${key}".`,
    ]);
  }
}
