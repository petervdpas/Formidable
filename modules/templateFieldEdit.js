// modules/templateFieldEdit.js

import { setupFieldEditModal } from "./modalSetup.js";
import { applyModalTypeClass } from "../utils/domUtils.js";
import { fieldTypes } from "../utils/fieldTypes.js";
import { validateField } from "../utils/templateValidation.js";
import { applyFieldAttributeDisabling } from "../utils/formUtils.js";
import { createToggleButtons } from "../utils/iconButtonToggle.js";
import { buildButtonGroup } from "../utils/buttonUtils.js";
import {
  createFieldEditButton,
  createFieldEditIconButton,
  createFieldDeleteButton,
  createFieldDeleteIconButton,
  // createReorderUpButton,
  // createReorderDownButton,
} from "./uiButtons.js";
import { setupOptionsEditor } from "../utils/optionsEditor.js";

function setupFieldEditor(container, onChange, allFields = []) {
  const state = {};
  const dom = {
    key: container.querySelector("#edit-key"),
    primaryKey: container.querySelector("#edit-primary-key"),
    label: container.querySelector("#edit-label"),
    description: container.querySelector("#edit-description"),
    twoColumn: container.querySelector("#edit-two-column"),
    twoColumnRow: container
      .querySelector("#edit-two-column")
      ?.closest(".switch-row"),
    sidebarItem: container.querySelector("#edit-sidebar-item"),
    sidebarItemRow: container
      .querySelector("#edit-sidebar-item")
      ?.closest(".switch-row"),
    default: container.querySelector("#edit-default"),
    options: container.querySelector("#edit-options"),
    type: container.querySelector("#edit-type-container select"),
  };

  let labelLocked = false;

  let optionsEditor = null;

  function initializeOptionsEditor(fieldType) {
    optionsEditor = setupOptionsEditor({
      type: fieldType,
      state,
      dom: {
        options: dom.options,
        containerRow: dom.options?.closest(".modal-form-row"),
      },
    });
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

    const isGuid = field.type === "guid";

    dom.key.value = isGuid ? "id" : field.key || "";
    dom.key.disabled = isGuid;

    if (dom.primaryKey) {
      dom.primaryKey.value = isGuid ? "true" : "false";
    }

    dom.label.value = isGuid ? "GUID" : field.label || "";

    dom.description.value = field.description || "";
    dom.twoColumn.checked = !!field.two_column;
    dom.sidebarItem.checked = !!field.sidebar_item;
    dom.default.value = field.default ?? "";

    labelLocked = field.label?.trim().length > 0 && field.label !== field.key;

    // ── Crucial Reset Before Attach ──
    dom.key.__listenersAttached = false;

    // ── Key input listeners ──
    if (!dom.key.__listenersAttached) {
      dom.key.__listenersAttached = true;

      dom.label.addEventListener("input", () => {
        labelLocked = dom.label.value.trim().length > 0;
      });

      dom.key.addEventListener("input", () => {
        const raw = dom.key.value.trim();

        if (!labelLocked && raw.length > 0) {
          const humanLabel = raw
            .replace(/[_\-]+/g, " ")
            .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
          dom.label.value = humanLabel;
        }

        labelLocked =
          dom.label.value.trim().length > 0 &&
          dom.label.value.toLowerCase() !== dom.key.value.toLowerCase();

        validate();
      });
    }

    // ── Type change ──
    if (dom.type) {
      // Empty and refill without loopstart/loopstop
      dom.type.innerHTML = "";

      for (const [typeKey, typeDef] of Object.entries(fieldTypes)) {
        const isLoop = typeKey === "loopstart" || typeKey === "loopstop";

        // Alleen overslaan als het NIET de huidige type is
        if (isLoop && typeKey !== field.type) {
          continue;
        }

        const option = document.createElement("option");
        option.value = typeKey;
        option.textContent = typeDef.label || typeKey;
        dom.type.appendChild(option);
      }

      dom.type.value = field.type || "text";

      dom.type.onchange = () => {
        const currentType = dom.type.value;
        const isGuidType = currentType === "guid";

        dom.key.value = isGuidType ? "id" : state.key || "";
        dom.key.disabled = isGuidType;

        dom.label.value = isGuidType ? "GUID" : state.label || "";

        initializeOptionsEditor(currentType);

        applyFieldAttributeDisabling(
          {
            ...dom,
            twoColumnRow: dom.twoColumnRow,
            sidebarItemRow: dom.sidebarItemRow,
          },
          currentType
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
        sidebarItemRow: dom.sidebarItemRow,
      },
      field.type
    );

    initializeOptionsEditor(field.type);

    if (optionsEditor && field.options) {
      optionsEditor.setValues(field.options);
    }

    const modal = container.closest(".modal");
    applyModalTypeClass(modal, field.type || "text", fieldTypes, "main");

    onChange?.(structuredClone(state));

    validate(); // IMPORTANT: validate after setting all values!
  }

  function validate() {
    const field = getField();
    field._originalKey = originalKey;

    const result = validateField(field, allFields);

    dom.key.classList.toggle("input-error", !result.valid);

    if (confirmBtn) {
      confirmBtn.disabled = !result.valid;
    }
  }

  function getField() {
    const options =
      optionsEditor?.getValues() ||
      (dom.options.value ? JSON.parse(dom.options.value) : undefined);

    const isGuid = dom.type?.value === "guid";

    const field = {
      key: isGuid ? "id" : dom.key.value.trim(),
      label: isGuid ? "GUID" : dom.label.value.trim(),
      description: dom.description.value.trim(),
      two_column: dom.twoColumn.checked,
      sidebar_item: dom.sidebarItem.checked,
      default: dom.default.value,
      options,
      type: dom.type?.value || "text",
    };

    if (isGuid) {
      field.primary_key = true;
    } else {
      delete field.primary_key;
    }

    return field;
  }

  return { setField, getField };
}

async function listFields(
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

  for (const [idx, field] of fields.entries()) {
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
    const actionsWrapper = document.createElement("div");
    actionsWrapper.className = "actions-wrapper";

    const fieldButtons = await createToggleButtons(
      {
        edit: () => onEdit?.(idx),
        delete: () => onDelete?.(idx),
      },
      {
        icon: {
          edit: (cb) => createFieldEditIconButton(idx, cb),
          delete: (cb) => createFieldDeleteIconButton(idx, cb),
        },
        label: {
          edit: (cb) => createFieldEditButton(idx, cb),
          delete: (cb) => createFieldDeleteButton(idx, cb),
        },
      }
    );

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

    actionsWrapper.appendChild(
      buildButtonGroup(fieldButtons.edit, fieldButtons.delete, "field-actions")
    );

    item.appendChild(labelEl);
    item.appendChild(actionsWrapper);
    listEl.appendChild(item);
  }
}

export function createEmptyField() {
  return { key: "", type: "text", label: "" };
}

let cachedFieldEditModal = null;
let cachedFieldEditSetup = null;

export function showFieldEditorModal(field, allFields = [], onConfirm) {
  let editor;

  if (!cachedFieldEditSetup) {
    cachedFieldEditSetup = setupFieldEditModal(() => {
      const confirmedField = editor.getField();

      if (confirmedField.type === "looper") {
        const loopKey = confirmedField.key;
        const loopLabel = confirmedField.label || loopKey;

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

        onConfirm?.([loopStart, loopStop]);
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

  editor = setupFieldEditor(container, null, allFields);
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
