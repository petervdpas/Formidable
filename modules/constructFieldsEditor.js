// modules/constructFieldsEditor.js

import { setupPopup } from "./popupManager.js";
import { applyPopupTypeClass } from "../utils/domUtils.js";
import { fieldTypes } from "../utils/fieldTypes.js";

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
    onChange?.(structuredClone(state.fields));
  });

  const btnClear = createConstructClearButton(() => {
    state.fields = [];
    renderFieldList();
    onChange?.(structuredClone(state.fields));
  });

  const buttonGroup = buildButtonGroup(btnAdd, btnClear, "inline-button-group");

  const btnTarget = document.getElementById("construct-fields-buttons");
  btnTarget.innerHTML = "";
  btnTarget.appendChild(buttonGroup);

  const popupEl = document.getElementById("construct-popup");
  const popup = setupPopup(popupEl, {
    escToClose: true,
    resizable: false,
  });

  const keyInput = popupEl.querySelector("#popup-key");
  const typeSelect = popupEl.querySelector("#popup-type");
  const labelInput = popupEl.querySelector("#popup-label");
  const descInput = popupEl.querySelector("#popup-description");
  const optionsRow = popupEl.querySelector("#popup-options-row");
  const optionsInput = popupEl.querySelector("#popup-options");
  const buttonsContainer = popupEl.querySelector(".popup-buttons");

  function populateTypeDropdown() {
    typeSelect.innerHTML = "";
    for (const [typeKey, typeDef] of Object.entries(fieldTypes)) {
      if (!typeDef.constructEnabled) continue;
      const option = document.createElement("option");
      option.value = typeKey;
      option.textContent = typeDef.label || typeKey;
      typeSelect.appendChild(option);
    }
  }

  function updatePopupUIForType(typeKey) {
    const typeDef = fieldTypes[typeKey];
    const disabled = typeDef?.disabledAttributes || [];

    optionsRow.style.display = disabled.includes("options") ? "none" : "";

    applyPopupTypeClass(popupEl, typeKey, fieldTypes);
  }

  typeSelect.addEventListener("change", () => {
    updatePopupUIForType(typeSelect.value);
  });

  function renderFieldList() {
    list.innerHTML = "";

    (state.fields || []).forEach((field, idx) => {
      const item = document.createElement("li");
      item.className = "construct-field-item";
      item.dataset.type = field.type;

      const label = document.createElement("span");
      label.className = "construct-field-label";
      label.textContent = `${field.label || "(unnamed)"} (${field.type})`;

      const editBtn = createConstructEditButton((event) => {
        populateTypeDropdown();

        keyInput.value = field.key || "";
        typeSelect.value = field.type || "text";
        labelInput.value = field.label || "";
        descInput.value = field.description || "";
        optionsInput.value = Array.isArray(field.options)
          ? field.options.join(", ")
          : field.options || "";

        updatePopupUIForType(typeSelect.value);
        buttonsContainer.innerHTML = "";

        const saveBtn = createConstructSaveButton(() => {
          field.key = keyInput.value.trim();
          field.type = typeSelect.value;
          field.label = labelInput.value.trim();
          field.description = descInput.value.trim();
          const opts = optionsInput.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          field.options = opts.length > 0 ? opts : undefined;

          popup.hide();
          renderFieldList();
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

  state.fields = state.fields || [];
  renderFieldList();

  return {
    setFields: (fields) => {
      state.fields = fields || [];
      renderFieldList();
    },
    getFields: () => structuredClone(state.fields || []),
  };
}
