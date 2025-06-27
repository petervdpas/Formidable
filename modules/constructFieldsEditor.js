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
  const descRow = descTextarea.closest(".popup-form-row");
  const optionsRow = popupEl.querySelector("#popup-options-row");
  const optionsInput = popupEl.querySelector("#popup-options");
  const buttonsContainer = popupEl.querySelector(".popup-buttons");

  let optionsEditorInstance = null;

  function syncHiddenInput() {
    if (hiddenInput) {
      hiddenInput.value = JSON.stringify(state.fields || []);
    }
  }

  function populateTypeDropdown() {
    typeSelect.innerHTML = "";
    for (const [typeKey, typeDef] of Object.entries(fieldTypes)) {
      if (typeDef.constructEnabled) {
        const option = document.createElement("option");
        option.value = typeKey;
        option.textContent = typeDef.label || typeKey;
        typeSelect.appendChild(option);
      }
    }
  }

  function updatePopupUIForType(typeKey) {
    applyPopupTypeClass(popupEl, typeKey, fieldTypes);
    applyConstructAttributeDisabling(popupEl, typeKey);

    // Recreate options editor
    if (optionsEditorInstance) {
      optionsRow.querySelector(".options-editor")?.remove();
      optionsRow.querySelector(".options-message")?.remove();
    }

    optionsEditorInstance = setupOptionsEditor({
      type: typeKey,
      state: currentEditingSubfield,
      dom: {
        options: optionsInput,
        containerRow: optionsRow,
      },
    });
  }

  let currentEditingSubfield = null;

  typeSelect.addEventListener("change", () => {
    if (currentEditingSubfield) {
      currentEditingSubfield.type = typeSelect.value;
    }
    updatePopupUIForType(typeSelect.value);
  });

  function renderFieldList() {
    list.innerHTML = "";

    (state.fields || []).forEach((subfield, idx) => {
      const item = document.createElement("li");
      item.className = "construct-field-item";
      item.dataset.type = subfield.type;

      const label = document.createElement("span");
      label.className = "construct-field-label";
      label.textContent = subfield.label || "--- New Field ---";

      const badge = document.createElement("span");
      badge.className = `subfield-type type-${subfield.type}`;
      badge.textContent = `(${subfield.type.toUpperCase()})`;

      label.appendChild(document.createTextNode(" "));
      label.appendChild(badge);

      const editBtn = createConstructEditButton((event) => {
        populateTypeDropdown();

        currentEditingSubfield = subfield;

        keyInput.value = subfield.key || "";
        typeSelect.value = subfield.type || "text";
        labelInput.value = subfield.label || "";
        descTextarea.value = subfield.description || "";
        optionsInput.value = JSON.stringify(subfield.options || []);

        updatePopupUIForType(typeSelect.value);

        buttonsContainer.innerHTML = "";

        const saveBtn = createConstructSaveButton(() => {
          const updated = {
            key: keyInput.value.trim(),
            type: typeSelect.value,
            label: labelInput.value.trim(),
            description: descTextarea.value.trim(),
          };

          const opts =
            optionsEditorInstance?.getValues?.() ||
            (optionsInput.value ? JSON.parse(optionsInput.value) : undefined);

          if (
            Array.isArray(opts) &&
            opts.length > 0 &&
            !fieldTypes[updated.type]?.disabledAttributes?.includes("options")
          ) {
            updated.options = opts;
          }

          state.fields[idx] = updated;
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
        state.fields.splice(idx, 1);
        renderFieldList();
        syncHiddenInput();
        onChange?.(structuredClone(state.fields));
      });

      const actions = buildButtonGroup(
        editBtn,
        deleteBtn,
        "construct-field-actions"
      );
      item.appendChild(label);
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
