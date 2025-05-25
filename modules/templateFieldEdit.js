// modules/templateFieldEdit.js

import { applyModalTypeClass } from "../utils/domUtils.js";
import { fieldTypes } from "../utils/fieldTypes.js";

function setupFieldEditor(container, onChange) {
  const state = {};

  const dom = {
    key: container.querySelector("#edit-key"),
    label: container.querySelector("#edit-label"),
    description: container.querySelector("#edit-description"),
    twoColumn: container.querySelector("#edit-two-column"),
    default: container.querySelector("#edit-default"),
    options: container.querySelector("#edit-options"),
    type: container.querySelector("#edit-type-container select"),
  };

  function setField(field) {
    Object.assign(state, field);

    dom.key.value = field.key || "";
    dom.label.value = field.label || "";
    dom.description.value = field.description || "";
    dom.twoColumn.checked = !!field.two_column;
    dom.default.value = field.default ?? "";
    dom.options.value = field.options ? JSON.stringify(field.options) : "";
    if (dom.type) dom.type.value = field.type || "text";

    // 🔥 Automatically apply modal CSS class
    const modal = container.closest(".modal");
    applyModalTypeClass(modal, field.type || "text", fieldTypes);

    onChange?.(structuredClone(state));
  }

  function getField() {
    return {
      key: dom.key.value.trim(),
      label: dom.label.value.trim(),
      description: dom.description.value.trim(),
      two_column: dom.twoColumn.checked,
      default: dom.default.value,
      options: dom.options.value ? JSON.parse(dom.options.value) : undefined,
      type: dom.type?.value || "text",
    };
  }

  return { setField, getField };
}

function renderReorderButtons(idx, total) {
  const upDisabled = idx === 0 ? "disabled" : "";
  const downDisabled = idx === total - 1 ? "disabled" : "";
  return `
    <button class="btn btn-light action-up" data-idx="${idx}" ${upDisabled}>▲</button>
    <button class="btn btn-light action-down" data-idx="${idx}" ${downDisabled}>▼</button>
  `;
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
    item.innerHTML = `
      <div class="field-label">
        ${field.label}
        <span class="field-type type-${field.type}">
          (${field.type.toUpperCase()})
        </span>
      </div>
      <div class="field-actions">
        <!-- ${renderReorderButtons(idx, fields.length)}  -->
        <button class="btn btn-warn action-edit" data-idx="${idx}">Edit</button>
        <button class="btn btn-danger action-delete" data-idx="${idx}">Delete</button>
      </div>
    `;
    item.dataset.type = field.type;
    listEl.appendChild(item);
  });

  listEl.querySelectorAll(".action-edit").forEach((btn) => {
    btn.onclick = () => onEdit?.(+btn.dataset.idx);
  });

  listEl.querySelectorAll(".action-delete").forEach((btn) => {
    btn.onclick = () => onDelete?.(+btn.dataset.idx);
  });

  listEl.querySelectorAll(".action-up").forEach((btn) => {
    btn.onclick = () => {
      const idx = +btn.dataset.idx;
      if (idx > 0) {
        onUp ? onUp(idx) : onReorder?.(idx, idx - 1);
      }
    };
  });

  listEl.querySelectorAll(".action-down").forEach((btn) => {
    btn.onclick = () => {
      const idx = +btn.dataset.idx;
      if (idx < fields.length - 1) {
        onDown ? onDown(idx) : onReorder?.(idx, idx + 1);
      }
    };
  });
}

export function createEmptyField() {
  return { key: "", type: "text", label: "" };
}

export function showFieldEditorModal(field) {
  const modal = document.getElementById("field-edit-modal");
  const body = modal.querySelector(".modal-body");
  const editor = setupFieldEditor(body);
  editor.setField(field);
  modal.classList.add("show");
}

export function renderFieldList(listEl, fields, {
  onEditIndex,
  onOpenEditModal
}) {
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
