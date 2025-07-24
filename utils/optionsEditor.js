// utils/optionsEditor.js

export function getSupportedOptionTypes() {
  return [
    "boolean",
    "dropdown",
    "multioption",
    "radio",
    "range",
    "list",
    "table",
  ];
}

export function setupOptionsEditor({ type = "text", dom, initialOptions }) {
  const optionTypes = getSupportedOptionTypes();
  const { options, containerRow } = dom || {};
  if (!options || !containerRow) return null;

  options.style.display = "none";
  containerRow.querySelector(".options-editor")?.remove();
  containerRow.querySelector(".options-message")?.remove();

  if (!optionTypes.includes(type)) {
    const msg = document.createElement("div");
    msg.className = "options-message";
    msg.textContent = "Options not available!";
    containerRow.appendChild(msg);
    return null;
  }

  const editor = createOptionsEditor(containerRow, (newOptions) => {
    options.value = JSON.stringify(newOptions, null, 2);
  });

  if (Array.isArray(initialOptions) && initialOptions.some((o) => o?.value)) {
    editor.setValues(initialOptions);
    options.value = JSON.stringify(initialOptions, null, 2);
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

  function destroy() {
    wrapper.remove();
  }

  return { setValues, getValues, destroy };
}
