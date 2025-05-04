// renderer.js

import { initEventRouter } from "./modules/eventRouter.js";

import { buildMenu, handleMenuAction } from "./modules/menuManager.js";
import {
  setupSettingsModal,
  setupEntryModal,
  setupTemplateModal,
  setupAboutModal,
} from "./modules/modalSetup.js";
import { initYamlEditor } from "./modules/yaml_editor.js";
import { createDropdown } from "./modules/dropdownManager.js";
import { initStatusHandler } from "./modules/handlers/statusHandler.js";
import { initFormManager } from "./modules/formUI.js";
import { log, warn, error } from "./modules/logger.js";
import { setContextView, initContextToggle } from "./modules/contextManager.js";
import { bindContextDependencies } from "./modules/handlers/contextHandlers.js";
import { initThemeToggle } from "./modules/uiBehaviors.js";
import {
  initTemplateListManager,
  initMetaListManager,
} from "./modules/sidebarManager.js";
import { createTemplateSelector } from "./modules/templateSelector.js";
import { EventBus } from "./modules/eventBus.js";

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
  initStatusHandler("status-bar");

  const templateContainer = document.getElementById("template-container");
  const markdownContainer = document.getElementById("markdown-container");
  const themeToggle = document.getElementById("theme-toggle");
  const contextToggle = document.getElementById("context-toggle");

  const yamlEditor = initYamlEditor("template-content", async (updatedYaml) => {
    let filename = window.currentSelectedTemplateName;

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
      EventBus.emit("status:update", "Cannot save: no template selected.");
      return;
    }

    const success = await window.api.templates.saveTemplate(
      filename,
      updatedYaml
    );
    if (success) {
      EventBus.emit("status:update", `Saved: ${filename}`);
      log("[YamlEditor] Saved template:", filename);
    } else {
      EventBus.emit("status:update", "Failed to save template.");
      error("[YamlEditor] Save failed for:", filename);
    }
  });

  const formManager = initFormManager("markdown-content");
  window.formManager = formManager;

  const config = await window.api.config.loadUserConfig();

  const settings = setupSettingsModal(themeToggle, contextToggle);
  const entryInputModal = setupEntryModal();
  const templateModal = setupTemplateModal();
  const aboutModal = setupAboutModal();

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
    config.default_markdown_dir,
    templateDropdown
  );

  const metaListManager = initMetaListManager(formManager, entryInputModal);
  formManager.setReloadMarkdownList(() => metaListManager.loadList());

  const { selectTemplate, loadTemplateOptions } = createTemplateSelector({
    formManager,
    metaListManager,
    templateDropdown,
  });

  // Inject required context dependencies into handler module
  bindContextDependencies({
    containers: { templateContainer, markdownContainer },
    dropdown: templateDropdown,
    metaListManager,
    currentTemplateGetter: () => window.currentSelectedTemplate,
  });

  await Promise.all([
    loadTemplateOptions(),
    templateListManager.loadList(),
    templateDropdown.refresh?.() ?? Promise.resolve(),
  ]);

  const selected = config.selected_template;
  if (selected) {
    window.currentSelectedTemplateName = selected;

    const container = document.getElementById("template-list");
    const { highlightAndClickMatch } = await import("./modules/uiBehaviors.js");
    highlightAndClickMatch(container, selected, async (fallbackName) => {
      const data = await window.api.templates.loadTemplate(fallbackName);
      yamlEditor.render(data);
      EventBus.emit("template:selected", {
        name: fallbackName,
        yaml: data,
      });
    });
  }

  // Set initial context view
  setContextView(config.context_mode, {
    templateContainer,
    markdownContainer,
  });

  // Listen for UI toggle and emit context change
  initContextToggle({ toggleElement: contextToggle });

  // Register all EventBus listeners (template:selected, context:toggle, status:update)
  initEventRouter();

  // Initial context mode from config
  const isMarkdown = config.context_mode === "markdown";
  document.getElementById("context-toggle").checked = isMarkdown;
  document.getElementById("context-toggle-menu").checked = isMarkdown;

  EventBus.emit("context:toggle", isMarkdown);

  initThemeToggle(themeToggle);
  EventBus.emit("theme:toggle", config.theme);
});
