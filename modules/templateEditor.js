// modules/templateEditor.js

import { EventBus } from "./eventBus.js";
import { showConfirmModal } from "./modalSetup.js";
import { setupFieldEditModal } from "./modalSetup.js";
import {
  renderFieldList,
  showFieldEditorModal,
  createEmptyField,
} from "./templateFieldEdit.js";
import { generateTemplateCode } from "../utils/templateGenerator.js";
import { formatError } from "../utils/templateValidation.js";
import {
  getEditor,
  handleEditorKey,
  initCodeMirror,
} from "./templateCodemirror.js";
import {
  createTemplateAddFieldButton,
  createTemplateSaveButton,
  createTemplateDeleteButton,
  createTemplateGeneratorButton,
} from "./uiButtons.js";

window.showConfirmModal = showConfirmModal;

const Sortable = window.Sortable;

let keyboardListenerAttached = false;
let editorWrapper = null;
let typeDropdown = null;

export function initTemplateEditor(containerId, onSaveCallback) {
  const container = document.getElementById(containerId);
  if (!container) {
    EventBus.emit("logging:warning", [
      "[YamlEditor] YAML editor container not found:",
      containerId,
    ]);
    return;
  }

  EventBus.emit("logging:default", [
    "[YamlEditor] Initialized editor in container:",
    containerId,
  ]);
  let currentData = null;
  let editModal,
    currentEditIndex = null;

  function renderEditor(data) {
    if (!data) {
      EventBus.emit("logging:warning", [
        "[YamlEditor] renderEditor() called with null data",
      ]);
      return;
    }

    currentData = structuredClone(data);
    EventBus.emit("logging:default", [
      "[YamlEditor] Rendering editor for:",
      currentData.name || "Unnamed",
    ]);

    container.innerHTML = `
    <fieldset>
      <legend>Setup Info</legend>
      <div class="modal-form-row">
        <label for="yaml-name">Name</label>
        <input type="text" id="yaml-name" value="${currentData.name || ""}" />
      </div>
      <div class="modal-form-row">
        <label for="storage-location">Storage Directory</label>
        <input type="text" id="storage-location" value="${
          currentData.storage_location || ""
        }" />
      </div>
      <div class="modal-form-row full-editor-row">
        <label for="markdown-template">Template Code <small>CTRL+ENTER for full screen</small></label>
        <div class="editor-wrapper">
          <textarea id="markdown-template" rows="4">${
            currentData.markdown_template || ""
          }</textarea>
        </div>
        <div class="button-row" id="template-generate-wrapper"></div>
      </div>
    </fieldset>

    <fieldset>
      <legend>Fields</legend>
      <ul id="fields-list" class="field-list"></ul>
      <div class="field-add-row" id="field-add-row"></div>
    </fieldset>

    <div class="button-group" id="template-actions-row"></div>
  `;

    // Init CodeMirror
    const textarea = container.querySelector("#markdown-template");
    initCodeMirror(textarea, currentData.markdown_template || "");
    editorWrapper = container.querySelector(".editor-wrapper");

    // ─── Dynamische Buttons ─────────────────────────────
    const generateBtnWrapper = container.querySelector(
      "#template-generate-wrapper"
    );
    const generateBtn = createTemplateGeneratorButton(() => {
      const code = generateTemplateCode(currentData.fields);
      getEditor().setValue(code);
      generateBtnWrapper.style.display = "none";
    });
    generateBtnWrapper.appendChild(generateBtn);

    const addFieldRow = container.querySelector("#field-add-row");
    addFieldRow.appendChild(
      createTemplateAddFieldButton(() => {
        currentEditIndex = null;
        openEditModal(createEmptyField());
      })
    );

    const actionsRow = container.querySelector("#template-actions-row");

    const saveBtn = createTemplateSaveButton(async () => {
      const fullTemplate = {
        name: container.querySelector("#yaml-name")?.value.trim() || "Unnamed",
        storage_location:
          container.querySelector("#storage-location")?.value.trim() || "",
        markdown_template: getEditor()?.getValue() || "",
        fields: currentData.fields || [],
      };

      const errors = await window.api.templates.validateTemplate(fullTemplate);
      if (errors && errors.length > 0) {
        const count = errors.length;
        EventBus.emit("status:update", `Validation failed: ${count} error(s).`);
        EventBus.emit("ui:toast", {
          message: `Template contains ${count} error${count > 1 ? "s" : ""}.`,
          variant: "error",
        });
        for (const err of errors) {
          EventBus.emit("ui:toast", {
            message: formatError(err),
            variant: "error",
          });
        }
        return;
      }

      EventBus.emit("editor:save", {
        container,
        fields: currentData.fields,
        callback: onSaveCallback,
      });

      const filename = window.currentSelectedTemplateName || "Unknown";
      EventBus.emit("status:update", `Template saved: ${filename}`);
      EventBus.emit("ui:toast", {
        message: `Template saved successfully: ${filename}`,
        variant: "success",
      });
    });

    const deleteBtn = createTemplateDeleteButton(() => {
      EventBus.emit("editor:delete", container);
    });

    actionsRow.appendChild(saveBtn);
    actionsRow.appendChild(deleteBtn);

    // ─── Editor Change → Show/Hide Generate Button ─────
    const editor = getEditor();
    const updateVisibility = () => {
      const hasCode = editor.getValue().trim().length > 0;
      generateBtnWrapper.style.display = hasCode ? "none" : "block";
    };
    editor.on("change", updateVisibility);
    updateVisibility();

    // ─── Field List Rendering ───────────────────────────
    renderFieldListWrapper();

    // ─── Keyboard Shortcuts ─────────────────────────────
    if (keyboardListenerAttached) {
      document.removeEventListener("keydown", handleEditorKey);
    }
    document.addEventListener("keydown", handleEditorKey);
    keyboardListenerAttached = true;

    // ─── Field Edit Modal Setup ─────────────────────────
    if (!editModal) {
      const modalSetup = setupFieldEditModal((field) => {
        if (currentEditIndex != null) {
          currentData.fields[currentEditIndex] = field;
        } else {
          currentData.fields.push(field);
        }
        renderFieldListWrapper();
      });

      editModal = modalSetup.modal;
      typeDropdown = modalSetup.typeDropdown;
    }
  }

  function renderFieldListWrapper() {
    const list = container.querySelector("#fields-list");
    renderFieldList(list, currentData.fields, {
      onEditIndex: (idx) => {
        currentEditIndex = idx;
      },
      onOpenEditModal: openEditModal,
    });
  }

  function openEditModal(field) {
    showFieldEditorModal(field, currentData.fields, (confirmedField) => {
      if (currentEditIndex != null) {
        currentData.fields[currentEditIndex] = confirmedField;
      } else {
        currentData.fields.push(confirmedField);
      }
      renderFieldListWrapper();
    });
  }

  return { render: renderEditor };
}
