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
      options: ["string", "number", "date", "bool", "dropdown", "reference"],
      defaultValue: "string",
      onChange(value, row) {
        if (row._choicesRow) {
          row._choicesRow.style.display = value === "dropdown" ? "" : "none";
          if (value !== "dropdown") row._choicesInput.value = "";
        }
        if (row._refRow) {
          row._refRow.style.display = value === "reference" ? "" : "none";
          if (value !== "reference" && row._refSelect) row._refSelect.value = "";
        }
      },
    },
    { key: "label", type: "text", placeholder: "label" },
    {
      key: "choices",
      type: "subrow",
      placeholder: "key:Label | key:Label",
      visibleWhen: { key: "type", value: "dropdown" },
    },
    {
      key: "reference",
      type: "subrow",
      subType: "dropdown",
      placeholder: "Select loop field…",
      visibleWhen: { key: "type", value: "reference" },
      buildOptions(allFields) {
        const opts = [];
        let inLoop = null;
        let depth = 0;
        for (const f of allFields) {
          if (f.type === "loopstart") {
            depth++;
            if (depth === 1) inLoop = f.key;
            continue;
          }
          if (f.type === "loopstop") {
            if (depth === 1) inLoop = null;
            depth--;
            continue;
          }
          if (depth === 1 && inLoop && f.key && f.type === "text") {
            opts.push({
              value: `${inLoop}.${f.key}`,
              label: `${inLoop} → ${f.label || f.key}`,
            });
          }
        }
        return opts;
      },
    },
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

export function setupOptionsEditor({
  type = "text",
  dom,
  initialOptions,
  allFields = [],
}) {
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

  const editor = createOptionsEditor(
    columns,
    containerRow,
    (newOptions) => {
      options.value = JSON.stringify(newOptions, null, 2);
    },
    allFields
  );

  if (Array.isArray(initialOptions) && initialOptions.some((o) => o?.value)) {
    editor.setValues(initialOptions);
    options.value = JSON.stringify(initialOptions, null, 2);
  }

  return editor;
}

function createOptionsEditor(columns, container, onChange, allFields = []) {
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

    const subrows = []; // subrow elements to append after the main row

    for (const col of columns) {
      let entry;

      if (col.type === "subrow") {
        // render as a full-width input on a separate line
        const subrow = document.createElement("div");
        subrow.className = "option-subrow";

        let inputEl;
        if (col.subType === "dropdown") {
          // dropdown subrow — populated from allFields via buildOptions
          inputEl = document.createElement("select");
          const emptyOpt = document.createElement("option");
          emptyOpt.value = "";
          emptyOpt.textContent = col.placeholder || `-- ${col.key} --`;
          inputEl.appendChild(emptyOpt);
          const opts = col.buildOptions?.(allFields) || [];
          for (const o of opts) {
            const optEl = document.createElement("option");
            optEl.value = o.value;
            optEl.textContent = o.label || o.value;
            inputEl.appendChild(optEl);
          }
          inputEl.value = values[col.key] || "";
          inputEl.addEventListener("change", emitChange);
        } else {
          inputEl = document.createElement("input");
          inputEl.type = "text";
          inputEl.placeholder = col.placeholder || col.key;
          inputEl.value = values[col.key] || "";
          inputEl.addEventListener("input", emitChange);
        }

        subrow.appendChild(inputEl);
        entry = {
          key: col.key,
          el: inputEl,
          type: col.subType === "dropdown" ? "dropdown" : "text",
        };

        // store refs for onChange callbacks (keyed by column key)
        if (col.key === "choices") {
          rowMap._choicesRow = subrow;
          rowMap._choicesInput = inputEl;
        } else if (col.key === "reference") {
          rowMap._refRow = subrow;
          rowMap._refSelect = inputEl;
        }

        // visibility based on another column's value
        if (col.visibleWhen) {
          const depVal = values[col.visibleWhen.key];
          subrow.style.display = depVal === col.visibleWhen.value ? "" : "none";
        }

        subrows.push(subrow);
      } else if (col.type === "dropdown") {
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
      if (col.type === "subrow") continue; // already has listener
      const entry = rowMap[col.key];
      const eventName = col.type === "dropdown" ? "change" : "input";

      entry.el.addEventListener(eventName, () => {
        col.onChange?.(entry.el.value, rowMap);
        emitChange();
      });
    }

    // run onChange callbacks for initial state
    for (const col of columns) {
      if (col.type === "subrow") continue;
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
      subrows.forEach((sr) => sr.remove());
      emitChange();
    };

    row.appendChild(removeBtn);
    list.appendChild(row);
    subrows.forEach((sr) => list.appendChild(sr));

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
        // ref columns require a field reference
        if (entry.type === "reference" && !entry.reference) return;
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
