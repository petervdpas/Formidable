// renderer.js

import { setupModal } from "./modules/modalManager.js";
import { initYamlEditor } from "./modules/yaml_editor.js";
import { createDropdown } from "./modules/dropdownManager.js";
import { initStatusManager, updateStatus } from "./modules/statusManager.js";
import { initFormManager } from "./modules/formManager.js";
import { createListManager } from "./modules/listManager.js";
import { log, warn, error } from "./modules/logger.js"; // <- Correct
import { initSplitters, setContextView } from "./modules/contextManager.js";

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
    const filename = window.currentSelectedTemplateName;
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

  const templateListManager = createListManager({
    elementId: "template-list",
    fetchListFunction: async () => await window.api.listTemplateFiles(),
    onItemClick: async (itemName) => {
      try {
        const data = await window.api.loadTemplateFile(itemName);
        yamlEditor.render(data);
        await window.configAPI.updateUserConfig({
          recent_templates: [itemName],
        });
        updateStatus(`Loaded Template: ${itemName}`);
      } catch (err) {
        error("[TemplateList] Failed to load template:", err);
        updateStatus("Error loading template.");
      }
    },
    emptyMessage: "No template files found.",
    addButton: {
      label: "+ Add Template",
      onClick: async () => {
        promptForTemplateName(async ({ filename, yaml }) => {
          try {
            await window.api.saveTemplateFile(filename, yaml);
            await templateListManager.loadList();
            await window.configAPI.updateUserConfig({
              recent_templates: [filename],
            });
            yamlEditor.render(yaml);
            updateStatus(`Created new template: ${filename}`);
          } catch (err) {
            error("[AddTemplate] Failed to save:", err);
            updateStatus("Error creating new template.");
          }
        });
      },
    },
  });

  function promptForTemplateName(callback) {
    const nameInput = document.getElementById("template-name");
    const dirInput = document.getElementById("template-dir");
    const confirmBtn = document.getElementById("template-confirm");

    nameInput.value = "";
    dirInput.value = "./markdowns";

    confirmBtn.onclick = async () => {
      const raw = nameInput.value.trim();
      if (!raw) return;

      const safeName = raw.replace(/\s+/g, "-").toLowerCase();
      const filename = `${safeName}.yaml`;
      const markdown_dir = dirInput.value.trim() || "markdown";

      templateModal.hide();

      callback({
        filename,
        yaml: {
          name: safeName,
          markdown_dir,
          fields: [],
        },
      });
    };

    templateModal.show();
    setTimeout(() => nameInput.focus(), 100);
  }

  const metaListManager = createListManager({
    elementId: "markdown-list", // still using this container ID
    fetchListFunction: async () => {
      const selectedTemplate = window.currentSelectedTemplate;
      if (!selectedTemplate) {
        warn("[MetaList] No selected template.");
        updateStatus("No template selected.");
        return [];
      }
      if (!selectedTemplate.markdown_dir) {
        warn("[MetaList] No markdown_dir field.");
        updateStatus("Template missing markdown_dir field.");
        return [];
      }

      await window.api.ensureMarkdownDir(selectedTemplate.markdown_dir);
      const files = await window.api.listMeta(selectedTemplate.markdown_dir);
      return files.map((f) => f.replace(/\.meta\.json$/, "")); // strip extension
    },

    onItemClick: async (entryName) => {
      try {
        const selectedTemplate = window.currentSelectedTemplate;
        if (!selectedTemplate) {
          warn("[MetaList] No template selected when clicking item.");
          return;
        }

        const dir = selectedTemplate.markdown_dir;
        const data = await window.api.loadMeta(dir, entryName);

        if (!data) {
          updateStatus("Failed to load metadata entry.");
          return;
        }

        await window.formManager.loadFormData(data, entryName);
        updateStatus(`Loaded metadata: ${entryName}`);
      } catch (err) {
        error("[MetaList] Failed to load entry:", err);
        updateStatus("Error loading metadata.");
      }
    },

    emptyMessage: "No metadata files found.",

    addButton: {
      label: "+ Add Entry",
      onClick: async () => {
        const selectedTemplate = window.currentSelectedTemplate;
        if (!selectedTemplate) {
          warn("[AddMarkdown] No template selected.");
          updateStatus("Please select a template first.");
          return;
        }

        promptForEntryName(async (filename) => {
          log("[AddMarkdown] Creating new entry:", filename);
          await window.formManager.loadFormData({}, filename);
          updateStatus("New metadata entry ready.");
        });
      },
    },
  });

  function promptForEntryName(callback) {
    const input = document.getElementById("entry-name");
    const checkbox = document.getElementById("entry-append-date");
    const confirm = document.getElementById("entry-confirm");

    input.value = "";
    checkbox.checked = true;

    confirm.onclick = () => {
      const raw = input.value.trim();
      if (!raw) return;

      const sanitized = raw.replace(/\s+/g, "-").toLowerCase();
      const appendDate = checkbox.checked;

      let finalName = sanitized;
      if (appendDate) {
        const now = new Date();
        const formatted = now.toISOString().slice(0, 10).replaceAll("-", "");
        finalName = `${sanitized}-${formatted}`;
      }

      entryInputModal.hide();
      callback(finalName);
    };

    entryInputModal.show();
    setTimeout(() => input.focus(), 100);
  }

  async function selectTemplate(name, { updateDropdown = true } = {}) {
    if (!name || name === window.currentSelectedTemplateName) return;

    try {
      const yamlData = await window.api.loadTemplateFile(name);
      window.currentSelectedTemplate = yamlData;
      window.currentSelectedTemplateName = name;

      if (updateDropdown) {
        templateDropdown.setSelected(name);
      }

      await window.configAPI.updateUserConfig({ last_selected_template: name });
      await window.api.ensureMarkdownDir(yamlData.markdown_dir);
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
