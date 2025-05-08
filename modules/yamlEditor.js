// modules/yamlEditor.js

import { log, warn, error } from "../utils/logger.js";
import { showConfirmModal } from "./modalManager.js";
import { setupFieldEditModal } from "./modalSetup.js";
import { EventBus } from "./eventBus.js";
import { fieldTypes } from "../utils/fieldTypes.js";

export function initYamlEditor(containerId, onSaveCallback) {
  const container = document.getElementById(containerId);
  if (!container) {
    warn("[YamlEditor] YAML editor container not found:", containerId);
    return;
  }

  log("[YamlEditor] Initialized editor in container:", containerId);
  let currentData = null;
  let editModal,
    currentEditIndex = null;

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
          <input type="text" id="markdown-dir" value="${
            currentData.markdown_dir || ""
          }" />
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
          <span class="field-type type-${
            field.type
          }">(${field.type.toUpperCase()})</span>
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
      warn(
        `[YamlEditor] Unknown type "${typeKey}" passed to applyModalTypeClass.`
      );
    }
  }

  let typeDropdown = null;
  let markdownDropdown = null;

  function openEditModal(field) {
    const modal = document.getElementById("field-edit-modal");
    applyModalTypeClass(modal, field.type || "text");

    document.getElementById("edit-key").value = field.key;
    document.getElementById("edit-label").value = field.label;
    document.getElementById("edit-default").value = field.default ?? "";
    document.getElementById("edit-options").value = (field.options || []).join(
      ", "
    );

    typeDropdown?.setSelected(field.type || "text");
    markdownDropdown?.setSelected(field.markdown || "");

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
      const template = window.currentSelectedTemplateName;
      if (!template) {
        warn("[YamlEditor] No template selected to delete.");
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
        log("[YamlEditor] Deleted template:", template);
        container.innerHTML =
          "<div class='empty-message'>Template deleted.</div>";
        EventBus.emit("status:update", `Deleted template: ${template}`);
        window.currentSelectedTemplate = null;
        window.currentSelectedTemplateName = null;
        if (window.templateListManager?.loadList)
          window.templateListManager.loadList();
      } else {
        warn("[YamlEditor] Failed to delete template:", template);
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
      markdownDropdown = modalSetup.markdownDropdown;
    }
  }

  return { render: renderEditor };
}
