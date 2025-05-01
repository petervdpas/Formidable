// modules/yaml_editor.js

import { log, warn } from "./logger.js";
import { setupModal, showConfirmModal } from "./modalManager.js";
import { updateStatus } from "./statusManager.js";

export function initYamlEditor(containerId, onSaveCallback) {
  const container = document.getElementById(containerId);
  if (!container) {
    warn("[YamlEditor] YAML editor container not found:", containerId);
    return;
  }

  log("[YamlEditor] Initialized editor in container:", containerId);
  let currentData = null;
  let editModal, currentEditIndex = null;

  function renderEditor(data) {
    currentData = structuredClone(data);
    log("[YamlEditor] Rendering editor for:", currentData.name || "Unnamed");

    container.innerHTML = `
      <fieldset>
        <legend>Setup Info</legend>
        <div class="form-row">
          <label for="yaml-name">Name</label>
          <input type="text" id="yaml-name" value="${currentData.name || ""}" />
        </div>
        <div class="form-row">
          <label for="markdown-dir">Markdown Dir</label>
          <input type="text" id="markdown-dir" value="${currentData.markdown_dir || ""}" />
        </div>
      </fieldset>

      <fieldset>
        <legend>Fields</legend>
        <ul id="fields-list" class="field-list"></ul>
        <div class="form-row">
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
  }

  function renderFieldList() {
    const list = container.querySelector("#fields-list");
    list.innerHTML = "";

    currentData.fields.forEach((field, idx) => {
      const item = document.createElement("li");
      item.className = "field-list-item";
      item.innerHTML = `
        <div class="field-label">
          ${field.label}
          <span class="field-type type-${field.type}">(${field.type.toUpperCase()})</span>
        </div>
        <div class="field-actions">
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
  }

  function applyModalTypeClass(modal, type) {
    modal.classList.remove("modal-text", "modal-boolean", "modal-dropdown");
    modal.classList.add(`modal-${type}`);
  }

  function openEditModal(field) {
    const modal = document.getElementById("field-edit-modal");
    applyModalTypeClass(modal, field.type || "text");

    modal.querySelector("#edit-key").value = field.key;
    modal.querySelector("#edit-type").value = field.type;
    modal.querySelector("#edit-label").value = field.label;
    modal.querySelector("#edit-default").value = field.default || "";
    modal.querySelector("#edit-markdown").value = field.markdown || "";
    modal.querySelector("#edit-options").value = (field.options || []).join(", ");

    editModal.show();
  }

  function wireEvents() {
    container.querySelector("#add-field").onclick = () => {
      currentEditIndex = null;
      openEditModal({ key: "", type: "text", label: "" });
    };

    container.querySelector("#save-yaml").onclick = () => {
      const name = container.querySelector("#yaml-name").value.trim();
      const dir = container.querySelector("#markdown-dir").value.trim();
      const updated = { name, markdown_dir: dir, fields: currentData.fields };
      log("[YamlEditor] Calling save callback with updated data:", updated);
      onSaveCallback?.(updated);
    };

    container.querySelector("#delete-yaml").onclick = async () => {
      const filename = window.currentSelectedTemplateName;
      if (!filename) {
        warn("[YamlEditor] No template selected to delete.");
        updateStatus("No template selected.");
        return;
      }
    
      const confirmed = await showConfirmModal(
        `Are you sure you want to delete template: ${filename}?`,
        {
          okText: "Delete",
          cancelText: "Cancel",
          width: "auto",
          height: "auto",
        }
      );
    
      if (!confirmed) return;
    
      const success = await window.api.deleteTemplateFile(filename);
      if (success) {
        log("[YamlEditor] Deleted template:", filename);
        container.innerHTML = "<div class='empty-message'>Template deleted.</div>";
        updateStatus(`Deleted template: ${filename}`);
        window.currentSelectedTemplate = null;
        window.currentSelectedTemplateName = null;
    
        if (window.templateListManager?.loadList) {
          window.templateListManager.loadList();
        }
      } else {
        warn("[YamlEditor] Failed to delete template:", filename);
        updateStatus("Failed to delete template.");
      }
    };

    if (!editModal) {
      editModal = setupModal("field-edit-modal", {
        closeBtn: "field-edit-close",
        escToClose: true,
        backdropClick: true,
        width: "40em",
        height: "auto",
      });

      const modal = document.getElementById("field-edit-modal");

      document.getElementById("edit-type").addEventListener("change", (e) => {
        const type = e.target.value;
        applyModalTypeClass(modal, type);
      });

      document.getElementById("field-edit-confirm").onclick = () => {
        const key = document.getElementById("edit-key").value.trim();
        const type = document.getElementById("edit-type").value;
        const label = document.getElementById("edit-label").value.trim();
        const def = document.getElementById("edit-default").value.trim();
        const markdown = document.getElementById("edit-markdown").value.trim();
        const options = document
          .getElementById("edit-options")
          .value.split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const field = { key, type, label };
        if (def) field.default = def;
        if (markdown) field.markdown = markdown;
        if (type === "dropdown" && options.length) field.options = options;

        if (currentEditIndex != null) {
          currentData.fields[currentEditIndex] = field;
        } else {
          currentData.fields.push(field);
        }

        editModal.hide();
        renderFieldList();
      };
    }
  }

  return { render: renderEditor };
}

