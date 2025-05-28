// modules/templateFieldEdit.js

import { applyModalTypeClass } from "../utils/domUtils.js";
import { fieldTypes } from "../utils/fieldTypes.js";
import { applyFieldAttributeDisabling } from "../utils/formUtils.js";
import {
  createFieldEditButton,
  createFieldDeleteButton,
  createReorderUpButton,
  createReorderDownButton,
} from "./uiButtons.js";

function setupFieldEditor(container, onChange, allKeys = []) {
  const state = {};

  const dom = {
    key: container.querySelector("#edit-key"),
    label: container.querySelector("#edit-label"),
    description: container.querySelector("#edit-description"),
    twoColumn: container.querySelector("#edit-two-column"),
    twoColumnRow: container
      .querySelector("#edit-two-column")
      ?.closest(".switch-row"),
    default: container.querySelector("#edit-default"),
    options: container.querySelector("#edit-options"),
    type: container.querySelector("#edit-type-container select"),
  };

  let optionsEditor = null;

  function setupOptionsEditor() {
    if (!dom.options) return;

    const containerRow = dom.options.closest(".modal-form-row");
    const currentType = dom.type?.value || "text";
    const optionTypes = ["dropdown", "multioption", "radio", "list", "table"];

    // Always hide raw <textarea> or JSON field
    dom.options.style.display = "none";

    // Clean previous editors/messages
    containerRow.querySelector(".options-editor")?.remove();
    containerRow.querySelector(".options-message")?.remove();

    if (!optionTypes.includes(currentType)) {
      // ➤ Add fallback message if unsupported
      const msg = document.createElement("div");
      msg.className = "options-message";
      msg.textContent = "Options not available!";
      containerRow.appendChild(msg);
      optionsEditor = null;
      return;
    }

    // Otherwise inject proper editor
    optionsEditor = createOptionsEditor(containerRow, (newOptions) => {
      dom.options.value = JSON.stringify(newOptions, null, 2);
      state.options = newOptions;
    });

    if (state.options) {
      optionsEditor.setValues(state.options);
    }
  }

  function setField(field) {
    Object.assign(state, field);

    dom.key.value = field.key || "";
    dom.label.value = field.label || "";
    dom.description.value = field.description || "";
    dom.twoColumn.checked = !!field.two_column;
    dom.default.value = field.default ?? "";

    let labelLocked = !!field.label;
    const originalKey = field.key?.trim();

    // Attach listeners only once
    if (!dom.key.__listenersAttached) {
      dom.key.__listenersAttached = true;

      dom.label.addEventListener("input", () => {
        labelLocked = dom.label.value.trim().length > 0;
      });

      dom.key.addEventListener("input", () => {
        const raw = dom.key.value.trim();

        // Autofill label
        if (!labelLocked && raw) {
          const humanLabel = raw
            .replace(/[_\-]+/g, " ")
            .replace(/\b\w/g, (m) => m.toUpperCase());
          dom.label.value = humanLabel;
        }

        // Duplicate key check
        const isDuplicate = allKeys.includes(raw) && raw !== originalKey;
        dom.key.classList.toggle("input-error", isDuplicate);
      });
    }

    if (dom.type) {
      dom.type.value = field.type || "text";
      dom.type.onchange = () => {
        setupOptionsEditor();
        applyFieldAttributeDisabling(
          {
            ...dom,
            twoColumnRow: dom.twoColumnRow,
          },
          dom.type.value
        );
      };
    }

    if (dom.options) {
      dom.options.value = field.options ? JSON.stringify(field.options) : "";
    }

    applyFieldAttributeDisabling(
      {
        ...dom,
        twoColumnRow: dom.twoColumnRow,
      },
      field.type
    );

    setupOptionsEditor();
    if (optionsEditor) {
      optionsEditor.setValues([]);
      if (field.options) optionsEditor.setValues(field.options);
    }

    const modal = container.closest(".modal");
    applyModalTypeClass(modal, field.type || "text", fieldTypes);

    onChange?.(structuredClone(state));
  }

  function getField() {
    const options =
      optionsEditor?.getValues() ||
      (dom.options.value ? JSON.parse(dom.options.value) : undefined);

    return {
      key: dom.key.value.trim(),
      label: dom.label.value.trim(),
      description: dom.description.value.trim(),
      two_column: dom.twoColumn.checked,
      default: dom.default.value,
      options,
      type: dom.type?.value || "text",
    };
  }

  return { setField, getField };
}

function listFields(
  listEl,
  fields,
  { onEdit, onDelete, onReorder, onUp, onDown }
) {
  if (!listEl) return;
  listEl.innerHTML = "";

  // Setup Sortable once
  if (!listEl.sortableInstance && typeof Sortable !== "undefined") {
    listEl.sortableInstance = Sortable.create(listEl, {
      animation: 150,
      handle: ".field-label",
      onEnd: (evt) => {
        onReorder?.(evt.oldIndex, evt.newIndex);
      },
    });
  }

  fields.forEach((field, idx) => {
    const item = document.createElement("li");
    item.className = "field-list-item";
    item.dataset.type = field.type;

    // Label + type
    const labelEl = document.createElement("div");
    labelEl.className = "field-label";
    labelEl.innerHTML = `
      ${field.label}
      <span class="field-type type-${field.type}">
        (${field.type.toUpperCase()})
      </span>
    `;

    // Acties
    const actionsEl = document.createElement("div");
    actionsEl.className = "field-actions";

    const btnEdit = createFieldEditButton(idx, () => onEdit?.(idx));
    const btnDelete = createFieldDeleteButton(idx, () => onDelete?.(idx));
    /*
    const btnUp = createReorderUpButton(idx, idx === 0, () => {
      if (idx > 0) onUp ? onUp(idx) : onReorder?.(idx, idx - 1);
    });
    const btnDown = createReorderDownButton(idx, fields.length, () => {
      if (idx < fields.length - 1)
        onDown ? onDown(idx) : onReorder?.(idx, idx + 1);
    });

    actionsEl.appendChild(btnUp);
    actionsEl.appendChild(btnDown);
    */
    actionsEl.appendChild(btnEdit);
    actionsEl.appendChild(btnDelete);

    item.appendChild(labelEl);
    item.appendChild(actionsEl);
    listEl.appendChild(item);
  });
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

export function createEmptyField() {
  return { key: "", type: "text", label: "" };
}

export function showFieldEditorModal(field, allKeys = []) {
  const modal = document.getElementById("field-edit-modal");
  const body = modal.querySelector(".modal-body");
  const editor = setupFieldEditor(body, null, allKeys);
  editor.setField(field);
  modal.classList.add("show");
}

export function renderFieldList(
  listEl,
  fields,
  { onEditIndex, onOpenEditModal }
) {
  listFields(listEl, fields, {
    onEdit: (idx) => {
      onEditIndex(idx);
      onOpenEditModal(fields[idx]);
    },
    onDelete: (idx) => {
      fields.splice(idx, 1);
      renderFieldList(listEl, fields, { onEditIndex, onOpenEditModal });
    },
    onReorder: (from, to) => {
      const moved = fields.splice(from, 1)[0];
      fields.splice(to, 0, moved);
      renderFieldList(listEl, fields, { onEditIndex, onOpenEditModal });
    },
    onUp: (idx) => {
      if (idx > 0) {
        [fields[idx - 1], fields[idx]] = [fields[idx], fields[idx - 1]];
        renderFieldList(listEl, fields, { onEditIndex, onOpenEditModal });
      }
    },
    onDown: (idx) => {
      if (idx < fields.length - 1) {
        [fields[idx], fields[idx + 1]] = [fields[idx + 1], fields[idx]];
        renderFieldList(listEl, fields, { onEditIndex, onOpenEditModal });
      }
    },
  });
}
