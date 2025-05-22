// modules/templateEditor.js

import { EventBus } from "./eventBus.js";
import { showConfirmModal } from "./modalSetup.js";
import { setupFieldEditModal } from "./modalSetup.js";
import { fieldTypes } from "../utils/fieldTypes.js";
import { getCurrentTheme } from "./themeToggle.js";

const Sortable = window.Sortable;

let codeMirrorEditor = null;
let keyboardListenerAttached = false;
let editorWrapper = null;

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

    editorWrapper = container.querySelector(".editor-wrapper");

    if (keyboardListenerAttached) {
      document.removeEventListener("keydown", handleEditorKey);
    }
    document.addEventListener("keydown", handleEditorKey);
    keyboardListenerAttached = true;
  }

  function renderFieldList() {
    const list = container.querySelector("#fields-list");
    list.innerHTML = "";

    if (!list.sortableInstance && typeof Sortable !== "undefined") {
      list.sortableInstance = Sortable.create(list, {
        animation: 150,
        handle: ".field-label",
        onEnd: (evt) => {
          const moved = currentData.fields.splice(evt.oldIndex, 1)[0];
          currentData.fields.splice(evt.newIndex, 0, moved);
          renderFieldList();
        },
      });
    }

    currentData.fields.forEach((field, idx) => {
      const item = document.createElement("li");
      item.className = "field-list-item";
      item.innerHTML = `
        <div class="field-label">
          ${field.label}
          <span class="field-type type-${
            field.type
          }">(${field.type.toUpperCase()})</span>
        </div>
        <div class="field-actions">
        <!--
          <button class="btn btn-light action-up" data-idx="${idx}">▲</button>
          <button class="btn btn-light action-down" data-idx="${idx}">▼</button> -->
          <button class="btn btn-warn action-edit" data-idx="${idx}">Edit</button>
          <button class="btn btn-danger action-delete" data-idx="${idx}">Delete</button>
        </div>
      `;
      item.dataset.type = field.type;
      list.appendChild(item);
    });

    list.querySelectorAll(".action-edit").forEach((btn) => {
      btn.onclick = () => {
        const idx = +btn.dataset.idx;
        currentEditIndex = idx;
        openEditModal(currentData.fields[idx]);
      };
    });

    list.querySelectorAll(".action-delete").forEach((btn) => {
      btn.onclick = () => {
        const idx = +btn.dataset.idx;
        currentData.fields.splice(idx, 1);
        renderFieldList();
      };
    });

    list.querySelectorAll(".action-up").forEach((btn) => {
      btn.onclick = () => {
        const idx = +btn.dataset.idx;
        if (idx > 0) {
          const fields = currentData.fields;
          [fields[idx - 1], fields[idx]] = [fields[idx], fields[idx - 1]];
          renderFieldList();
        }
      };
    });

    // Disable the first "up" button
    const firstUp = list.querySelector('.action-up[data-idx="0"]');
    if (firstUp) firstUp.disabled = true;

    list.querySelectorAll(".action-down").forEach((btn) => {
      btn.onclick = () => {
        const idx = +btn.dataset.idx;
        if (idx < currentData.fields.length - 1) {
          const fields = currentData.fields;
          [fields[idx], fields[idx + 1]] = [fields[idx + 1], fields[idx]];
          renderFieldList();
        }
      };
    });

    // Disable the last "down" button
    const lastIdx = currentData.fields.length - 1;
    const lastDown = list.querySelector(`.action-down[data-idx="${lastIdx}"]`);
    if (lastDown) lastDown.disabled = true;
  }

  function applyModalTypeClass(modal, typeKey) {
    if (!modal) return;

    // Remove existing modal-* classes except "modal"
    modal.classList.forEach((cls) => {
      if (cls.startsWith("modal-") && cls !== "modal") {
        modal.classList.remove(cls);
      }
    });

    const typeDef = fieldTypes[typeKey];
    if (typeDef?.cssClass) {
      modal.classList.add(typeDef.cssClass); // e.g., type-text
    } else {
      EventBus.emit("logging:warning", [
        `[YamlEditor] Unknown type "${typeKey}" passed to applyModalTypeClass.`,
      ]);
    }
  }

  let typeDropdown = null;

  function openEditModal(field) {
    const modal = document.getElementById("field-edit-modal");
    applyModalTypeClass(modal, field.type || "text");

    document.getElementById("edit-key").value = field.key;
    document.getElementById("edit-two-column").checked = !!field.two_column;
    document.getElementById("edit-label").value = field.label;
    document.getElementById("edit-description").value = field.description || "";
    document.getElementById("edit-default").value = field.default ?? "";

    const optionsField = document.getElementById("edit-options");
    try {
      optionsField.value = field.options
        ? JSON.stringify(field.options) // ← now compact
        : "";
    } catch {
      optionsField.value = "";
    }

    typeDropdown?.setSelected(field.type || "text");

    editModal.show();
  }

  function wireEvents() {
    container.querySelector("#add-field").onclick = () => {
      currentEditIndex = null;
      openEditModal({ key: "", type: "text", label: "" });
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
