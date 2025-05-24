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
import {
  getEditor,
  handleEditorKey,
  initCodeMirror,
  getValue as getMarkdownTemplate,
} from "./templateCodemirror.js";

window.showConfirmModal = showConfirmModal;

const Sortable = window.Sortable;

let editorWrapper = null;
let keyboardListenerAttached = false;
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
        <div class="button-row">
          <button id="generate-template" class="btn btn-info" style="display: none;">
            Generate Template
          </button>
        </div>
      </div>
    </fieldset>

    <fieldset>
      <legend>Fields</legend>
      <ul id="fields-list" class="field-list"></ul>
      <div class="field-add-row">
        <button id="add-field" class="btn btn-info">+ Add Field</button>
      </div>
    </fieldset>

    <div class="button-group">
      <button id="save-yaml" class="btn btn-warn">Save</button>
      <button id="delete-yaml" class="btn btn-danger">Delete</button>
    </div>
  `;

    wireEvents();
    renderFieldListWrapper();

    const textarea = container.querySelector("#markdown-template");
    initCodeMirror(textarea, currentData.markdown_template || "");

    setupGenerateTemplateButton(container, currentData.fields);

    editorWrapper = container.querySelector(".editor-wrapper");

    if (keyboardListenerAttached) {
      document.removeEventListener("keydown", handleEditorKey);
    }
    document.addEventListener("keydown", handleEditorKey);
    keyboardListenerAttached = true;
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

  function setupGenerateTemplateButton(container, fields) {
    const generateBtn = container.querySelector("#generate-template");
    if (!generateBtn) return;

    const editor = getEditor();

    const updateVisibility = () => {
      const hasCode = editor.getValue().trim().length > 0;
      generateBtn.style.display = hasCode ? "none" : "block";
    };

    editor.on("change", updateVisibility);
    updateVisibility(); // Initial check

    generateBtn.onclick = () => {
      const code = generateTemplateCode(fields);
      editor.setValue(code);
      generateBtn.style.display = "none";
    };
  }

  function openEditModal(field) {
    showFieldEditorModal(field);
  }

  function wireEvents() {
    container.querySelector("#add-field").onclick = () => {
      currentEditIndex = null;
      openEditModal(createEmptyField());
    };

    container.querySelector("#save-yaml").onclick = () => {
      EventBus.emit("editor:save", {
        container,
        fields: currentData.fields,
        callback: onSaveCallback,
      });
    };

    container.querySelector("#delete-yaml").onclick = () => {
      EventBus.emit("editor:delete", container);
    };

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

  return { render: renderEditor };
}
