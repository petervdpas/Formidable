// renderer.js

import { buildMenu, handleMenuAction } from "./modules/menuManager.js";
import {
  setupSettingsModal,
  setupEntryModal,
  setupTemplateModal,
  setupAboutModal,
} from "./modules/modalSetup.js";
import { initYamlEditor } from "./modules/yaml_editor.js";
import { createDropdown } from "./modules/dropdownManager.js";
import { initStatusManager, updateStatus } from "./modules/statusManager.js";
import { initFormManager } from "./modules/formUI.js";
import { log, warn, error } from "./modules/logger.js";
import { setContextView, initContextToggle } from "./modules/contextManager.js";
import { initThemeToggle, applyInitialTheme } from "./modules/themeToggler.js";
import {
  initTemplateListManager,
  initMetaListManager,
} from "./modules/sidebarManager.js";
import { createTemplateSelector } from "./modules/templateSelector.js";

window.addEventListener("DOMContentLoaded", async () => {
  log("[App] DOM loaded.");

  window.currentSelectedTemplate = null;
  window.currentSelectedTemplateName = null;

  document.querySelectorAll("button").forEach((btn) => {
    if (!btn.className.includes("btn")) {
      btn.classList.add("btn", "btn-default");
    }
  });

  buildMenu("app-menu", handleMenuAction);
  initStatusManager("status-bar");

  const templateContainer = document.getElementById("template-container");
  const markdownContainer = document.getElementById("markdown-container");
  const themeToggle = document.getElementById("theme-toggle");
  const contextToggle = document.getElementById("context-toggle");
  const menuToggle = document.getElementById("context-toggle-menu");

  const yamlEditor = initYamlEditor("template-content", async (updatedYaml) => {
    let filename = window.currentSelectedTemplateName;

    // Fallback if not set but we know the name
    if (!filename && updatedYaml?.name) {
      filename = `${updatedYaml.name}.yaml`;
      window.currentSelectedTemplateName = filename;
      window.currentSelectedTemplate = updatedYaml;
      log(
        "[YamlEditor] Recovered filename from template name field:",
        filename
      );
    }

    if (!filename) {
      warn("[YamlEditor] No template filename selected.");
      updateStatus("Cannot save: no template selected.");
      return;
    }

    const success = await window.api.templates.saveTemplate(
      filename,
      updatedYaml
    );
    if (success) {
      updateStatus(`Saved: ${filename}`);
      log("[YamlEditor] Saved template:", filename);
    } else {
      updateStatus("Failed to save template.");
      error("[YamlEditor] Save failed for:", filename);
    }
  });

  const formManager = initFormManager("markdown-content");
  window.formManager = formManager;

  const config = await window.api.config.loadUserConfig();
  await applyInitialTheme(config);

  const settings = setupSettingsModal(themeToggle, contextToggle);
  const entryInputModal = setupEntryModal();
  const templateModal = setupTemplateModal();
  const aboutModal = setupAboutModal();

  window.currentSelectedTemplateName = null;
  window.openSettingsModal = settings.show;
  window.openAboutModal = aboutModal.show;

  const templateDropdown = createDropdown({
    containerId: "template-selector",
    labelText: "Template",
    options: [],
    onChange: async (selectedName) => {
      log("[Dropdown] Changed selection to:", selectedName);
      await selectTemplate(selectedName);
    },
    onRefresh: async () => {
      const templates = await window.api.templates.listTemplates();
      return templates.map((name) => ({
        value: name,
        label: name.replace(/\.yaml$/, ""),
      }));
    },
  });

  window.templateListManager = initTemplateListManager(
    yamlEditor,
    templateModal,
    config.default_markdown_dir
  );

  const metaListManager = initMetaListManager(formManager, entryInputModal);
  formManager.setReloadMarkdownList(() => metaListManager.loadList());

  const { selectTemplate, loadTemplateOptions } = createTemplateSelector({
    formManager,
    metaListManager,
    templateDropdown,
  });

  await Promise.all([
    loadTemplateOptions(),
    templateListManager.loadList(),
    templateDropdown.refresh?.() ?? Promise.resolve(),
  ]);

  setContextView(config.context_mode, {
    templateContainer,
    markdownContainer,
  });

  // After setContextView(...) call
  initContextToggle({
    toggleElement: contextToggle,
    containers: {
      templateContainer,
      markdownContainer,
    },
    dropdown: templateDropdown,
    metaListManager,
    currentTemplateGetter: () => window.currentSelectedTemplate,
  });

  if (menuToggle) {
    contextToggle.addEventListener("change", () => {
      menuToggle.checked = contextToggle.checked;
    });
  
    menuToggle.addEventListener("change", () => {
      contextToggle.checked = menuToggle.checked;
    });
  }
  
  if (config.context_mode === "markdown" && window.currentSelectedTemplate) {
    await metaListManager.loadList();
  }

  initThemeToggle(themeToggle);
});
