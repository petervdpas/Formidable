// modules/templateEditor.js

import { EventBus } from "./eventBus.js";
import { showConfirmModal } from "./modalSetup.js";
import { setupFieldEditModal } from "./modalSetup.js";
import {
  renderFieldListInto,
  showFieldEditorModal,
  createEmptyField,
} from "./templateFieldEdit.js";
import { generateTemplateCode } from "../utils/templateGenerator.js";
import { getCurrentTheme } from "./themeToggle.js";

const Sortable = window.Sortable;

let codeMirrorEditor = null;
let keyboardListenerAttached = false;
let editorWrapper = null;
let typeDropdown = null;

function handleEditorKey(e) {
  if (!editorWrapper) return;

  EventBus.emit("logging:default", [
    `[YamlEditor] Key pressed: ctrl=${e.ctrlKey}, key=${e.key}`,
  ]);
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    EventBus.emit("logging:default", [
      "[YamlEditor] CTRL+ENTER pressed → toggle fullscreen",
    ]);
    EventBus.emit("screen:fullscreen", editorWrapper);
  }
  if (e.key === "Escape" && editorWrapper?.classList.contains("fullscreen")) {
    EventBus.emit("logging:default", [
      "[YamlEditor] ESC pressed → exit fullscreen",
    ]);
    EventBus.emit("screen:fullscreen", editorWrapper);
  }
}

// ─── CodeMirror Initializer ─────────────────────
function initCodeMirror(textarea, initialValue = "") {
  if (codeMirrorEditor) {
    codeMirrorEditor.toTextArea();
  }

  const cmTheme = getCurrentTheme() === "dark" ? "monokai" : "eclipse";

  codeMirrorEditor = CodeMirror.fromTextArea(textarea, {
    mode: "yaml",
    theme: cmTheme,
    lineNumbers: true,
    lineWrapping: true,
    scrollbarStyle: "native",
    viewportMargin: Infinity,
    autofocus: true,
  });

  codeMirrorEditor.setValue(initialValue);

  // Resize correctly after mount (especially for fullscreen toggle)
  setTimeout(() => {
    codeMirrorEditor.refresh();
    codeMirrorEditor.setSize("100%", "100%");
  }, 50);
}

function getMarkdownTemplate() {
  return codeMirrorEditor?.getValue().trim() || "";
}

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
    renderFieldList();

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

  function renderFieldList() {
    const list = container.querySelector("#fields-list");
    renderFieldListInto(list, currentData.fields, {
      onEdit: (idx) => {
        currentEditIndex = idx;
        openEditModal(currentData.fields[idx]);
      },
      onDelete: (idx) => {
        currentData.fields.splice(idx, 1);
        renderFieldList(); // re-render
      },
      onReorder: (from, to) => {
        const moved = currentData.fields.splice(from, 1)[0];
        currentData.fields.splice(to, 0, moved);
        renderFieldList(); // re-render to update indices
      },
      onUp: (idx) => {
        if (idx > 0) {
          const fields = currentData.fields;
          [fields[idx - 1], fields[idx]] = [fields[idx], fields[idx - 1]];
          renderFieldList();
        }
      },
      onDown: (idx) => {
        if (idx < currentData.fields.length - 1) {
          const fields = currentData.fields;
          [fields[idx], fields[idx + 1]] = [fields[idx + 1], fields[idx]];
          renderFieldList();
        }
      },
    });
  }

  function setupGenerateTemplateButton(container, fields) {
    const generateBtn = container.querySelector("#generate-template");
    if (!generateBtn) return;

    const updateVisibility = () => {
      const hasCode = codeMirrorEditor.getValue().trim().length > 0;
      generateBtn.style.display = hasCode ? "none" : "block";
    };

    codeMirrorEditor.on("change", updateVisibility);
    updateVisibility(); // Initial check

    generateBtn.onclick = () => {
      const code = generateTemplateCode(fields);
      codeMirrorEditor.setValue(code);
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
      const name = container.querySelector("#yaml-name").value.trim();
      const storageLocation = container
        .querySelector("#storage-location")
        .value.trim();
      const markdownTemplate = getMarkdownTemplate();
      const updated = {
        name,
        storage_location: storageLocation,
        markdown_template: markdownTemplate,
        fields: currentData.fields,
      };
      EventBus.emit("logging:default", [
        "[YamlEditor] Calling save callback with updated data:",
        updated,
      ]);
      onSaveCallback?.(updated);
    };

    container.querySelector("#delete-yaml").onclick = async () => {
      const template = window.currentSelectedTemplateName;
      if (!template) {
        EventBus.emit("logging:warning", [
          "[YamlEditor] No template selected to delete.",
        ]);
        EventBus.emit("status:update", "No template selected.");
        return;
      }

      const confirmed = await showConfirmModal(
        `Are you sure you want to delete template: ${template}?`,
        {
          okText: "Delete",
          cancelText: "Cancel",
          width: "auto",
          height: "auto",
        }
      );

      if (!confirmed) return;

      const success = await window.api.templates.deleteTemplate(template);
      if (success) {
        EventBus.emit("logging:default", [
          "[YamlEditor] Deleted template:",
          template,
        ]);
        container.innerHTML =
          "<div class='empty-message'>Template deleted.</div>";
        EventBus.emit("status:update", `Deleted template: ${template}`);
        window.currentSelectedTemplate = null;
        window.currentSelectedTemplateName = null;
        if (window.templateListManager?.loadList)
          window.templateListManager.loadList();
      } else {
        EventBus.emit("logging:warning", [
          "[YamlEditor] Failed to delete template:",
          template,
        ]);
        EventBus.emit("status:update", "Failed to delete template.");
      }
    };

    if (!editModal) {
      const modalSetup = setupFieldEditModal((field) => {
        if (currentEditIndex != null) {
          currentData.fields[currentEditIndex] = field;
        } else {
          currentData.fields.push(field);
        }
        renderFieldList();
      });

      editModal = modalSetup.modal;
      typeDropdown = modalSetup.typeDropdown;
    }
  }

  return { render: renderEditor };
}
