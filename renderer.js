// renderer.js

import { setupModal } from "./modules/modalManager.js";
import { setupSplitter } from "./modules/splitter.js";
import { initYamlEditor } from "./modules/yaml_editor.js";
import { createDropdown } from "./modules/dropdownManager.js";
import { initStatusManager, updateStatus } from "./modules/statusManager.js";
import { initFormManager } from "./modules/formManager.js";
import { createListManager } from "./modules/listManager.js";
import { log, warn, error } from "./modules/logger.js"; // <- Correct

window.addEventListener("DOMContentLoaded", async () => {
  log("[App] DOM loaded.");

  document.querySelectorAll("button").forEach((btn) => {
    if (!btn.className.includes("btn")) {
      btn.classList.add("btn", "btn-default");
    }
  });

  initStatusManager("status-bar");

  const setupContainer = document.getElementById("setup-container");
  const markdownContainer = document.getElementById("markdown-container");
  const themeToggle = document.getElementById("theme-toggle");
  const contextToggle = document.getElementById("context-toggle");

  let setupSplitterInitialized = false;
  let markdownSplitterInitialized = false;

  window.currentSelectedTemplate = null;

  const yamlEditor = initYamlEditor(
    "workspace-content",
    async (updatedYaml) => {
      updateStatus(`Saving "${updatedYaml.name}"...`);
      log("[YamlEditor] Save triggered:", updatedYaml);
    }
  );

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
    width: "30%",
    height: "auto",
  });

  window.openSettingsModal = settings.show;

  function initSplitters(mode) {
    if (mode === "setup" && !setupSplitterInitialized) {
      setupSplitter({
        splitter: document.getElementById("setup-splitter"),
        left: document.getElementById("setup-sidebar"),
        right: document.getElementById("setup-workspace"),
        container: document.getElementById("setup-container"),
        min: 150,
      });
      setupSplitterInitialized = true;
    }
    if (mode === "markdown" && !markdownSplitterInitialized) {
      setupSplitter({
        splitter: document.getElementById("markdown-splitter"),
        left: document.getElementById("markdown-sidebar"),
        right: document.getElementById("markdown-workspace"),
        container: document.getElementById("markdown-container"),
        min: 150,
      });
      markdownSplitterInitialized = true;
    }
  }

  function setContextView(mode) {
    const isMarkdown = mode === "markdown";
    setupContainer.style.display = isMarkdown ? "none" : "flex";
    markdownContainer.style.display = isMarkdown ? "flex" : "none";
    initSplitters(mode);
    log("[Context] Switched to:", mode);
  }

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
    elementId: "setup-list",
    fetchListFunction: async () => await window.api.listTemplateFiles(),
    onItemClick: async (itemName) => {
      try {
        const data = await window.api.loadTemplateFile(itemName);
        yamlEditor.render(data);
        await window.configAPI.updateUserConfig({ recent_setups: [itemName] });
        updateStatus(`Loaded setup: ${itemName}`);
      } catch (err) {
        error("[SetupList] Failed to load setup:", err);
        updateStatus("Error loading setup.");
      }
    },
    emptyMessage: "No setup files found.",
    addButton: {
      label: "+ Add Setup",
      onClick: async () => {
        log("[SetupList] Add Setup clicked.");
        // Optional: Open a "new setup" modal, etc.
      },
    },
  });

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
    const confirm = document.getElementById("entry-confirm");

    input.value = ""; // Reset input
    confirm.onclick = () => {
      const raw = input.value.trim();
      if (!raw) return;
      const sanitized = raw.replace(/\s+/g, "-").toLowerCase();
      const now = new Date();
      const formatted = now.toISOString().slice(0, 10); // "2025-04-14"
      const uniqueName = `${sanitized}-${formatted}`;
      entryInputModal.hide();
      callback(uniqueName);
    };

    entryInputModal.show();
    setTimeout(() => input.focus(), 100);
  }

  async function selectTemplate(name, { updateDropdown = true } = {}) {
    if (!name) {
      window.currentSelectedTemplate = null;
      updateStatus("No template selected.");
      return;
    }
    try {
      const yamlData = await window.api.loadTemplateFile(name);
      window.currentSelectedTemplate = yamlData;
      if (updateDropdown) {
        templateDropdown.setSelected(name);
      }
      await window.configAPI.updateUserConfig({ last_selected_template: name });
      await window.api.ensureMarkdownDir(
        window.currentSelectedTemplate.markdown_dir
      );
      await formManager.loadTemplate(window.currentSelectedTemplate);
      await metaListManager.loadList();
      updateStatus(`Selected template: ${window.currentSelectedTemplate.name}`);
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

  setContextView(config.context_mode);

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
    const mode = e.target.checked ? "markdown" : "setup";
    await window.configAPI.updateUserConfig({ context_mode: mode });
    setContextView(mode);
    if (mode === "markdown" && window.currentSelectedTemplate) {
      await metaListManager.loadList();
    }
    updateStatus(
      `Context set to ${mode === "markdown" ? "Markdown" : "Setup"}`
    );
  });
});
