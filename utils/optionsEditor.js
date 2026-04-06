// utils/optionsEditor.js

const defaultColumns = [
  { key: "value", type: "text", placeholder: "value" },
  { key: "label", type: "text", placeholder: "label" },
];

const optionColumnPresets = {
  list: [
    {
      key: "type",
      type: "dropdown",
      placeholder: "type",
      options: ["fixed", "custom"],
      defaultValue: "fixed",
      onChange(value, row) {
        if (value === "custom") {
          row.value.el.value = "[[custom]]";
          row.value.el.readOnly = true;
        } else {
          if (row.value.el.value === "[[custom]]") row.value.el.value = "";
          row.value.el.readOnly = false;
        }
      },
    },
    { key: "value", type: "text", placeholder: "value" },
    { key: "label", type: "text", placeholder: "label" },
  ],
  table: [
    { key: "value", type: "text", placeholder: "key" },
    {
      key: "type",
      type: "dropdown",
      placeholder: "type",
      options: ["string", "number", "date", "bool"],
      defaultValue: "string",
    },
    { key: "label", type: "text", placeholder: "label" },
  ],
};

export function getSupportedOptionTypes() {
  return [
    "boolean",
    "dropdown",
    "multioption",
    "radio",
    "range",
    "list",
    "table",
    "code",
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

  const columns = optionColumnPresets[type] || defaultColumns;

  const editor = createOptionsEditor(columns, containerRow, (newOptions) => {
    options.value = JSON.stringify(newOptions, null, 2);
  });

  if (Array.isArray(initialOptions) && initialOptions.some((o) => o?.value)) {
    editor.setValues(initialOptions);
    options.value = JSON.stringify(initialOptions, null, 2);
  }

  return editor;
}

function createOptionsEditor(columns, container, onChange) {
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

  function addRow(values = {}) {
    const row = document.createElement("div");
    row.className = "option-row";

    const inputs = [];
    const rowMap = {}; // { colKey: { el, type } } for callbacks

    for (const col of columns) {
      let entry;

      if (col.type === "dropdown") {
        const select = document.createElement("select");
        for (const opt of col.options) {
          const optEl = document.createElement("option");
          optEl.value = opt;
          optEl.textContent = opt;
          select.appendChild(optEl);
        }
        select.value = values[col.key] || col.defaultValue || col.options[0];
        entry = { key: col.key, el: select, type: "dropdown" };
        row.appendChild(select);
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = col.placeholder || col.key;
        input.value = values[col.key] || "";
        entry = { key: col.key, el: input, type: "text" };
        row.appendChild(input);
      }

      inputs.push(entry);
      rowMap[col.key] = entry;
    }

    // attach event listeners after all columns are created (so callbacks can reference siblings)
    for (const col of columns) {
      const entry = rowMap[col.key];
      const eventName = col.type === "dropdown" ? "change" : "input";

      entry.el.addEventListener(eventName, () => {
        col.onChange?.(entry.el.value, rowMap);
        emitChange();
      });
    }

    // run onChange callbacks for initial state
    for (const col of columns) {
      const entry = rowMap[col.key];
      col.onChange?.(entry.el.value, rowMap);
    }

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

    row.appendChild(removeBtn);
    list.appendChild(row);

    // store column refs on the row for getValues
    row._optionInputs = inputs;
  }

  function emitChange() {
    onChange?.(getValues());
  }

  function getValues() {
    const rows = list.querySelectorAll(".option-row");
    const result = [];
    rows.forEach((row) => {
      const entry = {};
      for (const { key, el, type } of row._optionInputs || []) {
        entry[key] = type === "dropdown" ? el.value : el.value.trim();
      }
      // only include rows that have a value key set
      if (entry.value) {
        // backfill label from value if missing
        if (columns.some((c) => c.key === "label") && !entry.label) {
          entry.label = entry.value;
        }
        result.push(entry);
      }
    });
    return result;
  }

  function setValues(options) {
    list.innerHTML = "";
    options.forEach((opt) => {
      if (typeof opt === "string") {
        addRow({ value: opt, label: opt });
      } else {
        addRow(opt);
      }
    });
  }

  function destroy() {
    wrapper.remove();
  }

  return { setValues, getValues, destroy };
}
