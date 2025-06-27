// modules/constructFieldsEditor.js

import { setupPopup } from "./popupManager.js";
import { applyPopupTypeClass } from "../utils/domUtils.js";
import { applyConstructAttributeDisabling } from "../utils/formUtils.js";
import { fieldTypes } from "../utils/fieldTypes.js";
import { setupOptionsEditor } from "../utils/optionsEditor.js";

import {
  createConstructAddButton,
  createConstructClearButton,
  createConstructSaveButton,
  createConstructCancelButton,
  createConstructEditButton,
  createConstructDeleteButton,
  buildButtonGroup,
} from "./uiButtons.js";

export function setupConstructFieldsEditor(containerEl, state, onChange) {
  containerEl.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.id = "construct-fields-container";

  const list = document.createElement("ul");
  list.className = "construct-field-list";
  wrapper.appendChild(list);
  containerEl.appendChild(wrapper);

  const btnTarget = document.getElementById("construct-fields-buttons");
  const hiddenInput = document.getElementById("edit-construct-fields");

  const popupEl = document.getElementById("construct-popup");
  const popup = setupPopup(popupEl, { escToClose: true, resizable: false });

  const keyInput = popupEl.querySelector("#popup-key");
  const typeSelect = popupEl.querySelector("#popup-type");
  const labelInput = popupEl.querySelector("#popup-label");
  const descTextarea = popupEl.querySelector("#popup-description");
  const optionsRow = popupEl.querySelector("#popup-options-row");
  const optionsInput = popupEl.querySelector("#popup-options");
  const buttonsContainer = popupEl.querySelector(".popup-buttons");

  let optionsEditorInstance = null;
  let currentEditingSubfield = null;

  function syncHiddenInput() {
    if (hiddenInput) {
      hiddenInput.value = JSON.stringify(state.fields || []);
    }
  }

  function populateTypeDropdown(currentType = "") {
    typeSelect.innerHTML = "";
    for (const [typeKey, typeDef] of Object.entries(fieldTypes)) {
      if (
        typeDef.constructEnabled &&
        typeKey !== "loopstart" &&
        typeKey !== "loopstop"
      ) {
        const option = document.createElement("option");
        option.value = typeKey;
        option.textContent = typeDef.label || typeKey;
        typeSelect.appendChild(option);
      }
    }

    // If the current type is not in the list (loopstart/loopstop), add it disabled
    if (
      currentType &&
      !Array.from(typeSelect.options).some((o) => o.value === currentType)
    ) {
      const opt = document.createElement("option");
      opt.value = currentType;
      opt.textContent = currentType.toUpperCase();
      opt.disabled = true;
      typeSelect.appendChild(opt);
    }
  }

  function updatePopupUIForType(typeKey) {
    applyPopupTypeClass(popupEl, typeKey, fieldTypes);
    applyConstructAttributeDisabling(popupEl, typeKey);

    optionsEditorInstance = setupOptionsEditor({
      type: typeKey,
      state: currentEditingSubfield,
      dom: {
        options: optionsInput,
        containerRow: optionsRow,
      },
    });
  }

  typeSelect.addEventListener("change", () => {
    if (currentEditingSubfield) {
      currentEditingSubfield.type = typeSelect.value;
    }
    updatePopupUIForType(typeSelect.value);
  });

  function renderFieldList() {
    list.innerHTML = "";

    // Drag-and-drop support
    if (!list.sortableInstance && typeof Sortable !== "undefined") {
      list.sortableInstance = Sortable.create(list, {
        animation: 150,
        handle: ".drag-handle",
        onEnd: (evt) => {
          const moved = state.fields.splice(evt.oldIndex, 1)[0];
          state.fields.splice(evt.newIndex, 0, moved);
          syncHiddenInput();
          onChange?.(structuredClone(state.fields));
        },
      });
    }

    (state.fields || []).forEach((subfield, idx) => {
      const item = document.createElement("li");
      item.className = "construct-field-item";
      item.dataset.type = subfield.type;

      const labelRow = document.createElement("div");
      labelRow.className = "construct-field-label";

      const dragHandle = document.createElement("span");
      dragHandle.className = "drag-handle";
      dragHandle.textContent = "☰";

      const labelText = document.createTextNode(
        ` ${subfield.label || "--- New Field ---"} `
      );

      const badge = document.createElement("span");
      badge.className = `subfield-type type-${subfield.type}`;
      badge.textContent = `(${subfield.type.toUpperCase()})`;

      // Mark visually if it's loopstart/stop
      if (["loopstart", "loopstop"].includes(subfield.type)) {
        badge.classList.add("is-loop-boundary");
      }

      labelRow.appendChild(dragHandle);
      labelRow.appendChild(labelText);
      labelRow.appendChild(badge);

      const editBtn = createConstructEditButton((event) => {
        currentEditingSubfield = subfield;

        populateTypeDropdown(subfield.type);
        keyInput.value = subfield.key || "";
        typeSelect.value = subfield.type || "text";
        labelInput.value = subfield.label || "";
        descTextarea.value = subfield.description || "";
        optionsInput.value = JSON.stringify(subfield.options || []);

        updatePopupUIForType(typeSelect.value);

        buttonsContainer.innerHTML = "";

        const saveBtn = createConstructSaveButton(() => {
          const type = typeSelect.value;
          const key = keyInput.value.trim();
          const label = labelInput.value.trim();
          const desc = descTextarea.value.trim();

          const opts =
            optionsEditorInstance?.getValues?.() ||
            (optionsInput.value ? JSON.parse(optionsInput.value) : undefined);

          const shouldHaveOptions =
            Array.isArray(opts) &&
            opts.length > 0 &&
            !fieldTypes[type]?.disabledAttributes?.includes("options");

          if (type === "looper") {
            const loopLabel = label || key || "Loop";
            const loopFields = [
              {
                key,
                type: "loopstart",
                label: loopLabel,
                description: desc,
              },
              {
                key,
                type: "loopstop",
                label: loopLabel,
                description: desc,
              },
            ];
            state.fields.splice(idx, 1, ...loopFields);
          } else {
            const updated = {
              key,
              type,
              label,
              description: desc,
            };

            if (shouldHaveOptions) {
              updated.options = opts;
            }

            state.fields[idx] = updated;
          }

          popup.hide();
          renderFieldList();
          syncHiddenInput();
          onChange?.(structuredClone(state.fields));
        });

        const cancelBtn = createConstructCancelButton(() => popup.hide());
        buttonsContainer.appendChild(saveBtn);
        buttonsContainer.appendChild(cancelBtn);

        popup.show(event, { position: "above" });
      });

      const deleteBtn = createConstructDeleteButton(() => {
        const removed = state.fields[idx];
        const removedKey = removed.key;
        const removedType = removed.type;

        state.fields.splice(idx, 1);

        if (["loopstart", "loopstop"].includes(removedType)) {
          const partnerType =
            removedType === "loopstart" ? "loopstop" : "loopstart";
          const partnerIdx = state.fields.findIndex(
            (f) => f.key === removedKey && f.type === partnerType
          );
          if (partnerIdx !== -1) {
            state.fields.splice(partnerIdx, 1);
          }
        }

        renderFieldList();
        syncHiddenInput();
        onChange?.(structuredClone(state.fields));
      });

      const actions = buildButtonGroup(
        editBtn,
        deleteBtn,
        "construct-field-actions"
      );

      item.appendChild(labelRow);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  const btnAdd = createConstructAddButton(() => {
    state.fields = state.fields || [];
    state.fields.push({
      key: "",
      type: "text",
      label: "",
      description: "",
      default: "",
    });
    renderFieldList();
    syncHiddenInput();
    onChange?.(structuredClone(state.fields));
  });

  const btnClear = createConstructClearButton(() => {
    state.fields = [];
    renderFieldList();
    syncHiddenInput();
    onChange?.(structuredClone(state.fields));
  });

  const buttonGroup = buildButtonGroup(btnAdd, btnClear, "inline-button-group");
  btnTarget.innerHTML = "";
  btnTarget.appendChild(buttonGroup);

  state.fields = state.fields || [];
  renderFieldList();
  syncHiddenInput();

  return {
    setFields: (fields) => {
      state.fields = fields || [];
      renderFieldList();
      syncHiddenInput();
    },
    getFields: () => structuredClone(state.fields || []),
  };
}
