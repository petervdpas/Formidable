// renderer.js

// ───── Imports ──────────────────────────────
import { EventBus } from "./modules/eventBus.js";
import { initEventRouter } from "./modules/eventRouter.js";
import { initStatusHandler } from "./modules/handlers/statusHandler.js";

import { initThemeToggle } from "./modules/themeToggle.js";
import { buildMenu, handleMenuAction } from "./modules/menuManager.js";
import { createDropdown } from "./modules/dropdownManager.js";
import { initYamlEditor } from "./modules/yamlEditor.js";
import { createFormManager } from "./modules/formUI.js";

import {
  setupSettingsModal,
  setupEntryModal,
  setupTemplateModal,
  setupAboutModal,
} from "./modules/modalSetup.js";

import {
  createTemplateListManager,
  createStorageListManager,
} from "./modules/sidebarManager.js";

import { createTemplateSelector } from "./modules/templateSelector.js";

import { setContextView, initContextToggle } from "./modules/contextManager.js";

import { bindContextDependencies } from "./modules/handlers/contextHandlers.js";
import { bindTemplateDependencies } from "./modules/handlers/templateHandlers.js";
import { bindFormDependencies } from "./modules/handlers/formHandlers.js";
import { bindListDependencies } from "./modules/handlers/listHandlers.js";

// ───── DOM Ready ──────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  console.log("[App] DOM loaded.");

  // ── Global UI State ──
  window.currentSelectedTemplate = null;
  window.currentSelectedTemplateName = null;

  document.querySelectorAll("button").forEach((btn) => {
    if (!btn.className.includes("btn")) {
      btn.classList.add("btn", "btn-default");
    }
  });

  // ── EventBus Init
  initEventRouter();

  // ── Static UI Init ──
  buildMenu("app-menu", handleMenuAction);
  initStatusHandler("status-bar");

  const config = await window.api.config.loadUserConfig();

  // ── Grab DOM Elements ──
  const templateContainer = document.getElementById("template-container");
  const storageContainer = document.getElementById("storage-container");
  const themeToggle = document.getElementById("theme-toggle");
  const contextToggle = document.getElementById("context-toggle");
  const loggingToggle = document.getElementById("logging-toggle");

  // ── Logging Toggler
  EventBus.emit("logging:toggle", config.logging_enabled);

  // ── Modals ──
  const settings = setupSettingsModal(
    themeToggle,
    contextToggle,
    loggingToggle
  );
  const entryInputModal = setupEntryModal();
  const templateModal = setupTemplateModal();
  const aboutModal = setupAboutModal();

  window.openSettingsModal = settings.show;
  window.openAboutModal = aboutModal.show;

  // ── Form System ──
  const formManager = createFormManager("storage-content");
  window.formManager = formManager;

  // ── Template Dropdown ──
  const templateDropdown = createDropdown({
    containerId: "template-selector",
    labelText: "Template",
    options: [],
    onChange: async (selectedName) => {
      EventBus.emit("logging:default", [
        "[Dropdown] Changed selection to:",
        selectedName,
      ]);
      await selectTemplate(selectedName); // wired below
    },
    onRefresh: async () => {
      const templates = await window.api.templates.listTemplates();
      return templates.map((name) => ({
        value: name,
        label: name.replace(/\.yaml$/, ""),
      }));
    },
  });

  // ── Template Editor ──
  const yamlEditor = initYamlEditor("template-content", async (updatedYaml) => {
    let template = window.currentSelectedTemplateName;

    if (!template && updatedYaml?.name) {
      template = `${updatedYaml.name}.yaml`;
      window.currentSelectedTemplateName = template;
      window.currentSelectedTemplate = updatedYaml;
      EventBus.emit("logging:default", [
        "[YamlEditor] Recovered from template name:",
        template,
      ]);
    }

    if (!template) {
      EventBus.emit("logging:warning", ["[YamlEditor] No template selected."]);
      EventBus.emit("status:update", "Cannot save: no template selected.");
      return;
    }

    const success = await window.api.templates.saveTemplate(
      template,
      updatedYaml
    );
    if (success) {
      EventBus.emit("status:update", `Saved: ${template}`);
    } else {
      EventBus.emit("status:update", "Failed to save template.");
    }
  });

  // ── Sidebars ──
  window.templateListManager = createTemplateListManager(
    templateModal,
    config.storage_location,
    templateDropdown
  );

  const metaListManager = createStorageListManager(formManager, entryInputModal);

  // ── Template Selection Logic ──
  const { selectTemplate, loadTemplateOptions } = createTemplateSelector({
    templateDropdown,
  });

  // ── Event Handler Binding ──
  bindContextDependencies({
    containers: { templateContainer, storageContainer },
    dropdown: templateDropdown,
  });

  bindTemplateDependencies({
    formManager,
    metaListManager,
    yamlEditor,
  });

  bindFormDependencies({
    formManager,
    metaListManager,
  });

  bindListDependencies({
    templateListManager: window.templateListManager,
    metaListManager,
  });

  // ── Initial Data Load ──
  await Promise.all([
    loadTemplateOptions(),
    templateListManager.loadList(),
    templateDropdown.refresh?.() ?? Promise.resolve(),
  ]);

  // ── Re-apply Last Selected Template ──
  if (config.selected_template) {
    window.currentSelectedTemplateName = config.selected_template;
    EventBus.emit("template:list:highlighted", config.selected_template);
  }

  // ── Context & Theme Setup ──
  setContextView(config.context_mode, {
    templateContainer,
    storageContainer,
  });

  initContextToggle({ toggleElement: contextToggle });
  initThemeToggle(themeToggle);

  document.getElementById("context-toggle").checked =
    config.context_mode === "storage";
  document.getElementById("context-toggle-menu").checked =
    config.context_mode === "storage";

  // ── EventBus Startup ──
  EventBus.emit("context:toggle", config.context_mode === "storage");
  EventBus.emit("theme:toggle", config.theme);
});
