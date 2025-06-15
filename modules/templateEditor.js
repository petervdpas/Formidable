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
import { ensureVirtualLocation } from "../utils/vfsUtils.js";
import { createToggleButtons } from "../utils/iconButtonToggle.js";
import {
  getEditor,
  handleEditorKey,
  initCodeMirror,
} from "./templateCodemirror.js";
import {
  createTemplateAddFieldButton,
  createTemplateSaveButton,
  createTemplateSaveIconButton,
  createTemplateDeleteButton,
  createTemplateDeleteIconButton,
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

  async function renderEditor(data) {
    if (!data) {
      EventBus.emit("logging:warning", [
        "[YamlEditor] renderEditor() called with null data",
      ]);
      return;
    }

    data = await ensureVirtualLocation(data);

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
      <div class="modal-form-row full-editor-row">
        <label for="markdown-template">Template Code <small>CTRL+ENTER for full screen</small></label>
        <div class="editor-wrapper">
          <textarea id="markdown-template" rows="7">${
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

    const { save, delete: del } = await createToggleButtons(
      {
        save: async () => {
          const fullTemplate = {
            name:
              container.querySelector("#yaml-name")?.value.trim() || "Unnamed",
            markdown_template: getEditor()?.getValue() || "",
            fields: currentData.fields || [],
          };

          const errors = await new Promise((resolve) => {
            EventBus.emit("template:validate", {
              data: fullTemplate,
              callback: resolve,
            });
          });

          if (errors?.length > 0) {
            EventBus.emit(
              "status:update",
              `Validation failed: ${errors.length} error(s).`
            );
            errors.forEach((err) =>
              EventBus.emit("ui:toast", {
                message: formatError(err),
                variant: "error",
              })
            );
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
        },
        delete: () => {
          EventBus.emit("editor:delete", container);
        },
      },
      {
        icon: {
          save: createTemplateSaveIconButton,
          delete: createTemplateDeleteIconButton,
        },
        label: {
          save: createTemplateSaveButton,
          delete: createTemplateDeleteButton,
        },
      }
    );

    actionsRow.appendChild(save);
    actionsRow.appendChild(del);

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
