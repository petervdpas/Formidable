// modules/constructFieldsEditor.js

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
  // Clear existing content
  containerEl.innerHTML = "";

  const list = document.createElement("ul");
  list.className = "construct-field-list";
  containerEl.appendChild(list);

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

  const buttonGroup = buildButtonGroup(
    btnAdd,
    btnClear,
    "construct-fields-buttons"
  );
  containerEl.appendChild(buttonGroup);

  function renderFieldList() {
    list.innerHTML = "";

    (state.fields || []).forEach((field, idx) => {
      const item = document.createElement("li");
      item.className = "construct-field-item";

      const label = document.createElement("span");
      label.className = "construct-field-label";
      label.textContent = `${field.label || "(unnamed)"} (${field.type})`;
      item.appendChild(label);

      // Inline editor container
      const editor = document.createElement("div");
      editor.className = "construct-inline-editor";
      editor.style.display = "none";
      editor.innerHTML = `
        <input type="text" placeholder="Key" value="${field.key || ""}" />
        <input type="text" placeholder="Type" value="${field.type || ""}" />
        <input type="text" placeholder="Label" value="${field.label || ""}" />
        <input type="text" placeholder="Description" value="${field.description || ""}" />
      `;

      const saveBtn = createConstructSaveButton(() => {
        const inputs = editor.querySelectorAll("input");
        field.key = inputs[0].value.trim();
        field.type = inputs[1].value.trim() || "text";
        field.label = inputs[2].value.trim();
        field.description = inputs[3].value.trim();
        renderFieldList();
        onChange?.(structuredClone(state.fields));
      });

      const cancelBtn = createConstructCancelButton(() => {
        editor.style.display = "none";
      });

      const editorActions = buildButtonGroup(
        saveBtn,
        cancelBtn,
        "construct-inline-editor-actions"
      );

      editor.appendChild(editorActions);
      item.appendChild(editor);

      // Actions: Edit / Delete
      const editBtn = createConstructEditButton(() => {
        editor.style.display = "block";
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

      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  // Initial render
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
