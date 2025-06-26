// utils/optionsEditor.js

import { shouldEnableAttribute } from "./formUtils.js";

export function setupOptionsEditor({ type = "text", state, dom }) {
  const { options, containerRow } = dom || {};
  if (!options || !containerRow) return null;

  // Always hide raw <textarea> or JSON field
  options.style.display = "none";

  // Clean previous editors/messages
  containerRow.querySelector(".options-editor")?.remove();
  containerRow.querySelector(".options-message")?.remove();

  if (!shouldEnableAttribute(type, "options")) {
    const msg = document.createElement("div");
    msg.className = "options-message";
    msg.textContent = "Options not available!";
    containerRow.appendChild(msg);
    return null;
  }

  const editor = createOptionsEditor(containerRow, (newOptions) => {
    options.value = JSON.stringify(newOptions, null, 2);
    state.options = newOptions;
  });

  if (state.options) {
    editor.setValues(state.options);
  }

  return editor;
}

function createOptionsEditor(container, onChange) {
  const wrapper = document.createElement("div");
  wrapper.className = "options-editor";

  const list = document.createElement("div");
  list.className = "options-list";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.textContent = "+";
  addBtn.className = "add-option-btn";
  addBtn.setAttribute("aria-label", "Add option");
  addBtn.title = "Add option";
  addBtn.onclick = () => addRow();

  wrapper.appendChild(list);
  wrapper.appendChild(addBtn);
  container.appendChild(wrapper);

  function addRow(value = "", label = "") {
    const row = document.createElement("div");
    row.className = "option-row";

    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.placeholder = "value";
    valueInput.value = value;

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "label";
    labelInput.value = label;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "−";
    removeBtn.className = "remove-option-btn";
    removeBtn.setAttribute("aria-label", "Remove option");
    removeBtn.title = "Remove option";
    removeBtn.onclick = () => {
      row.remove();
      emitChange();
    };

    row.appendChild(valueInput);
    row.appendChild(labelInput);
    row.appendChild(removeBtn);
    list.appendChild(row);

    valueInput.addEventListener("input", emitChange);
    labelInput.addEventListener("input", emitChange);
  }

  function emitChange() {
    onChange?.(getValues());
  }

  function getValues() {
    const rows = list.querySelectorAll(".option-row");
    const options = [];
    rows.forEach((row) => {
      const [valueInput, labelInput] = row.querySelectorAll("input");
      const value = valueInput.value.trim();
      const label = labelInput.value.trim();
      if (value) {
        options.push({ value, label: label || value });
      }
    });
    return options;
  }

  function setValues(options) {
    list.innerHTML = "";
    options.forEach((opt) => {
      const { value, label } =
        typeof opt === "string" ? { value: opt, label: opt } : opt;
      addRow(value, label);
    });
  }

  return { setValues, getValues };
}