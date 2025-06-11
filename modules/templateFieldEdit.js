// modules/templateFieldEdit.js

import { setupFieldEditModal } from "./modalSetup.js";
import { applyModalTypeClass } from "../utils/domUtils.js";
import { fieldTypes } from "../utils/fieldTypes.js";
import { applyFieldAttributeDisabling } from "../utils/formUtils.js";
import {
  createFieldEditButton,
  createFieldDeleteButton,
  // createReorderUpButton,
  // createReorderDownButton,
} from "./uiButtons.js";

function setupFieldEditor(container, onChange, allFields = []) {
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
  let labelLocked = false;

  function setupOptionsEditor() {
    if (!dom.options) return;

    const containerRow = dom.options.closest(".modal-form-row");
    const currentType = dom.type?.value || "text";
    const optionTypes = [
      "boolean",
      "dropdown",
      "multioption",
      "radio",
      "range",
      "list",
      "table",
    ];

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

  let originalKey = "";
  let confirmBtn = null;

  function setField(field) {
    Object.assign(state, field);
    originalKey = field.key?.trim();

    dom.key.classList.remove("input-error");
    confirmBtn = document.getElementById("btn-field-edit-confirm");
    if (confirmBtn) {
      confirmBtn.disabled = false;
    }

    dom.key.value = field.key || "";
    dom.label.value = field.label || "";
    dom.description.value = field.description || "";
    dom.twoColumn.checked = !!field.two_column;
    dom.default.value = field.default ?? "";

    labelLocked = field.label?.trim().length > 0 && field.label !== field.key;

    // Attach listeners only once
    if (!dom.key.__listenersAttached) {
      dom.key.__listenersAttached = true;

      dom.label.addEventListener("input", () => {
        labelLocked = dom.label.value.trim().length > 0;
      });

      dom.key.addEventListener("input", validate);
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

        validate();
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

    validate(); // IMPORTANT: validate after setting all values!
  }

  function validate() {
    const raw = dom.key.value.trim();
    const currentType = dom.type.value;

    // Autogenerate label if empty and user started typing
    if (!labelLocked && raw.length > 0) {
      const humanLabel = raw
        .replace(/[_\-]+/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase());
      dom.label.value = humanLabel;
    }

    const isEditingExisting = originalKey?.length > 0;
    let isDuplicate = false;
    let hasMatchingPartner = true;

    if (["loopstart", "loopstop"].includes(currentType)) {
      const expectedPartnerType =
        currentType === "loopstart" ? "loopstop" : "loopstart";

      isDuplicate = allFields.some(
        (f) =>
          f.key === raw &&
          f.type === currentType &&
          (!isEditingExisting ||
            f.key !== originalKey ||
            f.type !== currentType)
      );

      const hasAnyLoop = allFields.some(
        (f) => f.key === raw && ["loopstart", "loopstop"].includes(f.type)
      );

      const hasPartner = allFields.some(
        (f) =>
          f.key === raw &&
          f.type === expectedPartnerType &&
          (!isEditingExisting ||
            f.key !== originalKey ||
            f.type !== currentType)
      );

      hasMatchingPartner = !hasAnyLoop || hasPartner;
    } else {
      isDuplicate = allFields.some(
        (f) => f.key === raw && (!isEditingExisting || f.key !== originalKey)
      );
    }

    dom.key.classList.toggle("input-error", isDuplicate);

    if (confirmBtn) {
      confirmBtn.disabled =
        raw.length === 0 || isDuplicate || !hasMatchingPartner;
    }
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

    // Drag handle
    const dragSpan = document.createElement("span");
    dragSpan.className = "drag-handle";
    dragSpan.textContent = "☰"; // or "⠿" if preferred
    labelEl.appendChild(dragSpan);

    // Label text
    const textNode = document.createTextNode(` ${field.label} `);
    labelEl.appendChild(textNode);

    // Field type
    const typeSpan = document.createElement("span");
    typeSpan.className = `field-type type-${field.type}`;
    typeSpan.textContent = `(${field.type.toUpperCase()})`;
    labelEl.appendChild(typeSpan);

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

let cachedFieldEditModal = null;
let cachedFieldEditSetup = null;

export function showFieldEditorModal(field, allFields = [], onConfirm) {
  if (!cachedFieldEditSetup) {
    cachedFieldEditSetup = setupFieldEditModal((confirmedField) => {
      if (confirmedField.type === "looper") {
        const loopKey = confirmedField.key;
        const loopLabel = confirmedField.label || loopKey;

        // Create loopstart and loopstop
        const loopStart = {
          key: loopKey,
          label: loopLabel,
          type: "loopstart",
        };

        const loopStop = {
          key: loopKey,
          label: loopLabel,
          type: "loopstop",
        };

        onConfirm?.(loopStart);
        onConfirm?.(loopStop);
      } else {
        onConfirm?.(confirmedField);
      }
    });
    cachedFieldEditModal = cachedFieldEditSetup.modal;
  }

  const container = document.querySelector("#field-edit-modal .modal-body");
  if (!container) {
    EventBus.emit("logging:error", ["Modal body not found"]);
    return;
  }

  const editor = setupFieldEditor(container, null, allFields);
  editor.setField(field);
  cachedFieldEditModal.show();
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
      const removed = fields[idx];
      const removedKey = removed.key;
      const removedType = removed.type;

      fields.splice(idx, 1);

      // If it's a loopstart or loopstop, remove its partner
      if (["loopstart", "loopstop"].includes(removedType)) {
        const partnerType =
          removedType === "loopstart" ? "loopstop" : "loopstart";

        const partnerIdx = fields.findIndex(
          (f) => f.key === removedKey && f.type === partnerType
        );

        if (partnerIdx !== -1) {
          fields.splice(partnerIdx, 1);
        }
      }

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
