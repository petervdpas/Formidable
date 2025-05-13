// utils/fieldAppliers.js

import { warn } from "./logger.js";

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

export function applyGenericField(input, key, value) {
  if (!input) {
    warn(`[UI] applyFieldValues: Missing input for key "${key}".`);
    return;
  }

  if (input.type === "checkbox") {
    input.checked = value === true;
  } else if (input.type === "radio") {
    const group = input.closest("form")?.querySelectorAll?.(
      `input[type="radio"][name="${key}"]`
    );
    group?.forEach((el) => {
      el.checked = el.value === value;
    });
  } else if ("value" in input) {
    input.value = value ?? "";
  } else {
    warn(`[UI] applyFieldValues: Unsupported input for key "${key}".`);
  }
}
