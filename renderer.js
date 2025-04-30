// renderer.js

import { setupModal } from "./modules/modalManager.js";
import { initYamlEditor } from "./modules/yaml_editor.js";
import { createDropdown } from "./modules/dropdownManager.js";
import { initStatusManager, updateStatus } from "./modules/statusManager.js";
import { initFormManager } from "./modules/formManager.js";
import { log, warn, error } from "./modules/logger.js"; // <- Correct
import { setContextView } from "./modules/contextManager.js";
import {
  initTemplateListManager,
  initMetaListManager,
} from "./modules/listLoader.js";

window.addEventListener("DOMContentLoaded", async () => {
  log("[App] DOM loaded.");

  document.querySelectorAll("button").forEach((btn) => {
    if (!btn.className.includes("btn")) {
      btn.classList.add("btn", "btn-default");
    }
  });

  initStatusManager("status-bar");

  const templateContainer = document.getElementById("template-container");
  const markdownContainer = document.getElementById("markdown-container");
  const themeToggle = document.getElementById("theme-toggle");
  const contextToggle = document.getElementById("context-toggle");

  window.currentSelectedTemplate = null;
  window.currentSelectedTemplateName = null;

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

    const success = await window.api.saveTemplateFile(filename, updatedYaml);
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

  const config = await window.configAPI.loadUserConfig();
  if (config.theme === "dark") {
    document.body.classList.add("dark-mode");
  }

  const settings = setupModal("settings-modal", {
    closeBtn: "settings-close",
    escToClose: true,
    backdropClick: true,
    resizable: true,
    width: "20em",
    height: "auto",
    onOpen: async () => {
      const config = await window.configAPI.loadUserConfig();
      themeToggle.checked = config.theme === "dark";
      contextToggle.checked = config.context_mode === "markdown";
    },
  });

  const entryInputModal = setupModal("entry-modal", {
    closeBtn: "entry-cancel",
    escToClose: true,
    backdropClick: true,
    width: "30em",
    height: "auto",
  });

  const templateModal = setupModal("template-modal", {
    closeBtn: "template-cancel",
    escToClose: true,
    backdropClick: true,
    width: "30em",
    height: "auto",
  });

  window.openSettingsModal = settings.show;
  window.currentSelectedTemplateName = null;

  const templateDropdown = createDropdown({
    containerId: "template-selector",
    labelText: "Template",
    options: [],
    onChange: async (selectedName) => {
      log("[Dropdown] Changed selection to:", selectedName);
      await selectTemplate(selectedName);
    },
  });

  const templateListManager = initTemplateListManager(
    yamlEditor,
    templateModal
  );
  const metaListManager = initMetaListManager(formManager, entryInputModal);

  async function selectTemplate(name, { updateDropdown = true } = {}) {
    if (!name || name === window.currentSelectedTemplateName) return;

    try {
      const result = await window.api.getTemplateDescriptor(name);
      const yamlData = result.yaml;

      window.currentSelectedTemplate = yamlData;
      window.currentSelectedTemplateName = name;

      if (updateDropdown) {
        templateDropdown.setSelected(name);
      }

      await window.configAPI.updateUserConfig({ last_selected_template: name });
      await window.api.ensureMarkdownDir(result.markdownDir);
      await formManager.loadTemplate(yamlData);
      await metaListManager.loadList();
      updateStatus(`Selected template: ${yamlData.name}`);
    } catch (err) {
      error("[SelectTemplate] Error:", err);
      updateStatus("Error selecting template.");
    }
  }

  async function loadTemplateOptions() {
    const templateFiles = await window.api.listTemplateFiles();
    const options = templateFiles.map((name) => ({
      value: name,
      label: name.replace(/\.yaml$/, ""),
    }));
    templateDropdown.updateOptions(options);

    const config = await window.configAPI.loadUserConfig();
    if (config.last_selected_template) {
      await selectTemplate(config.last_selected_template, {
        updateDropdown: false,
      });
    }
  }

  await loadTemplateOptions();
  await templateListManager.loadList();

  setContextView(config.context_mode, {
    templateContainer,
    markdownContainer,
  });

  if (config.context_mode === "markdown" && window.currentSelectedTemplate) {
    await metaListManager.loadList();
  }

  themeToggle.addEventListener("change", async (e) => {
    const isDark = e.target.checked;
    document.body.classList.toggle("dark-mode", isDark);
    await window.configAPI.updateUserConfig({
      theme: isDark ? "dark" : "light",
    });
    updateStatus(`Theme set to ${isDark ? "Dark" : "Light"}`);
  });

  contextToggle.addEventListener("change", async (e) => {
    const mode = e.target.checked ? "markdown" : "template";
    await window.configAPI.updateUserConfig({ context_mode: mode });
    setContextView(mode, {
      templateContainer,
      markdownContainer,
    });
    if (mode === "markdown" && window.currentSelectedTemplate) {
      await metaListManager.loadList();
    }
    updateStatus(
      `Context set to ${mode === "markdown" ? "Markdown" : "Template"}`
    );
  });
});
