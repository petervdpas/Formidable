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
import { initStatusManager } from "./modules/statusManager.js";
import { initFormManager } from "./modules/formUI.js";
import { log, warn, error } from "./modules/logger.js";
import { setContextView, initContextToggle } from "./modules/contextManager.js";
import { initThemeToggle, applyInitialTheme } from "./modules/themeToggler.js";
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
  initStatusManager("status-bar");

  const templateContainer = document.getElementById("template-container");
  const markdownContainer = document.getElementById("markdown-container");
  const themeToggle = document.getElementById("theme-toggle");
  const contextToggle = document.getElementById("context-toggle");
  const menuToggle = document.getElementById("context-toggle-menu");

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
    config.default_markdown_dir,
    templateDropdown ?? null
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

  // ✅ NEW: Listen for EventBus toggle events
  EventBus.on("context:toggle", (isMarkdown) => {
    log("[EventBus] Received context:toggle:", isMarkdown);
    if (contextToggle) contextToggle.checked = isMarkdown;
    if (menuToggle) menuToggle.checked = isMarkdown;

    setContextView(isMarkdown ? "markdown" : "template", {
      templateContainer,
      markdownContainer,
    });
  });

  EventBus.on("template:selected", async ({ name, yaml }) => {
    log("[EventBus] template:selected received:", name);

    // 🔄 Central state update
    window.currentSelectedTemplateName = name;
    window.currentSelectedTemplate = yaml;

    // 🔄 Highlight sidebar only if not already selected
    const listItem = Array.from(
      document.querySelectorAll("#template-list .template-item")
    ).find(
      (el) =>
        el.textContent.trim().toLowerCase() ===
        name.replace(/\.yaml$/, "").toLowerCase()
    );

    if (listItem && !listItem.classList.contains("selected")) {
      listItem.click(); // simulate selection to trigger sidebar visuals
    }
  });

  initThemeToggle(themeToggle);
});
