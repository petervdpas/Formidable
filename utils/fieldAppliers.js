// utils/fieldAppliers.js

import { EventBus } from "../modules/eventBus.js";
import { showOptionPopup } from "./popupUtils.js";

export function applyListField(container, field, value) {
  const key = field.key;
  const options = field.options || [];

  const listWrapper = container.querySelector(`[data-list-field="${key}"]`);
  if (!listWrapper) return;

  const addButton = listWrapper.querySelector("button");
  const existingItems = listWrapper.querySelectorAll('div input[type="text"]');
  existingItems.forEach((el) => el.parentElement.remove());

  (value || []).forEach((item) => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = item;

    // If options exist, activate popup behavior
    if (options.length > 0) {
      input.readOnly = true;
      input.onclick = () => showOptionPopup(input, options);

      // Check if value is in allowed options
      const isValid = options.some((opt) =>
        typeof opt === "string" ? opt === item : opt.value === item
      );

      if (!isValid) {
        input.classList.add("invalid-option");
        input.placeholder = "⚠ Not in list";
        input.title = "This value is not in the allowed options";
      }

      if (!value) {
        setTimeout(() => {
          input.click();
        }, 0);
      }
    }

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

export function applyImageField(container, key, value, template) {
  const wrapper = container.querySelector(`[data-image-field="${key}"]`);
  const preview = wrapper?.querySelector("img");

  if (!wrapper || !preview) {
    EventBus.emit("logging:warning", [
      `[applyImageField] Missing wrapper or image element for key "${key}"`,
    ]);
    return;
  }

  // If it's already a base64 URI
  if (typeof value === "string" && value.startsWith("data:image")) {
    preview.src = value;
    return;
  }

  if (!template?.storage_location || !value) {
    EventBus.emit("logging:warning", [
      `[applyImageField] Missing storage_location or value`,
    ]);
    return;
  }

  window.api.system
    .resolvePath(template.storage_location, "images", value)
    .then((imgPath) => {
      preview.src = `file://${imgPath.replace(/\\/g, "/")}`;
      wrapper.setAttribute("data-filename", value);
    })
    .catch((err) => {
      EventBus.emit("logging:error", [
        `[applyImageField] Failed to resolve image path: ${value}`,
        err,
      ]);
    });
}

export function applyGenericField(input, key, value) {
  if (!input) {
    EventBus.emit("logging:warning", [
      `[applyGenericField] Missing input for key "${key}".`,
    ]);
    return;
  }

  // 🩹 Radio group (wrapped in field container)
  if (input.dataset?.radioGroup === key) {
    const radios = input.querySelectorAll(`input[type="radio"]`);
    radios.forEach((el) => {
      el.checked = String(el.value) === String(value);
    });
    return;
  }

  // Checkbox
  if (input.type === "checkbox") {
    input.checked = value === true;
    return;
  }

  // Text, number, select, etc.
  if ("value" in input) {
    // Handle undefined/null safely: if null/undefined, leave default as-is
    input.value = value != null ? String(value) : "";
    return;
  }

  EventBus.emit("logging:warning", [
    `[applyGenericField] Unsupported input element for key "${key}".`,
  ]);
}
