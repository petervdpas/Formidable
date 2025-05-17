// renderer.js

// ───── Imports ──────────────────────────────
import { log, warn, error } from "./utils/logger.js";
import { EventBus } from "./modules/eventBus.js";

import { initStatusHandler } from "./modules/handlers/statusHandler.js";
import { initThemeToggle } from "./modules/themeToggle.js";
import { initEventRouter } from "./modules/eventRouter.js";

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
  createMetaListManager,
} from "./modules/sidebarManager.js";

import { createTemplateSelector } from "./modules/templateSelector.js";

import { setContextView, initContextToggle } from "./modules/contextManager.js";

import { bindContextDependencies } from "./modules/handlers/contextHandlers.js";
import { bindTemplateDependencies } from "./modules/handlers/templateHandlers.js";

// ───── DOM Ready ──────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  log("[App] DOM loaded.");

  // ── Global UI State ──
  window.currentSelectedTemplate = null;
  window.currentSelectedTemplateName = null;

  document.querySelectorAll("button").forEach((btn) => {
    if (!btn.className.includes("btn")) {
      btn.classList.add("btn", "btn-default");
    }
  });

  // ── Static UI Init ──
  buildMenu("app-menu", handleMenuAction);
  initStatusHandler("status-bar");

  const config = await window.api.config.loadUserConfig();

  // ── Grab DOM Elements ──
  const templateContainer = document.getElementById("template-container");
  const markdownContainer = document.getElementById("markdown-container");
  const themeToggle = document.getElementById("theme-toggle");
  const contextToggle = document.getElementById("context-toggle");

  // ── Modals ──
  const settings = setupSettingsModal(themeToggle, contextToggle);
  const entryInputModal = setupEntryModal();
  const templateModal = setupTemplateModal();
  const aboutModal = setupAboutModal();

  window.openSettingsModal = settings.show;
  window.openAboutModal = aboutModal.show;

  // ── Form System ──
  const formManager = createFormManager("markdown-content");
  window.formManager = formManager;

  // ── Template Dropdown ──
  const templateDropdown = createDropdown({
    containerId: "template-selector",
    labelText: "Template",
    options: [],
    onChange: async (selectedName) => {
      log("[Dropdown] Changed selection to:", selectedName);
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
      log("[YamlEditor] Recovered from template name:", template);
    }

    if (!template) {
      warn("[YamlEditor] No template selected.");
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

  EventBus.on("template:selected", ({ name, yaml }) => {
    yamlEditor.render(yaml);
  });
  
  // ── Sidebars ──
  window.templateListManager = createTemplateListManager(
    yamlEditor,
    templateModal,
    config.storage_location,
    templateDropdown
  );

  const metaListManager = createMetaListManager(formManager, entryInputModal);

  // ── Template Selection Logic ──
  const { selectTemplate, loadTemplateOptions } = createTemplateSelector({
    templateDropdown,
  });

  // ── Event Handler Binding ──
  bindContextDependencies({
    containers: { templateContainer, markdownContainer },
    dropdown: templateDropdown,
  });

  bindTemplateDependencies({
    formManager,
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
    markdownContainer,
  });

  initContextToggle({ toggleElement: contextToggle });
  initThemeToggle(themeToggle);

  document.getElementById("context-toggle").checked =
    config.context_mode === "form";
  document.getElementById("context-toggle-menu").checked =
    config.context_mode === "form";

  // ── EventBus Startup ──
  initEventRouter();
  EventBus.emit("context:toggle", config.context_mode === "form");
  EventBus.emit("theme:toggle", config.theme);
});
