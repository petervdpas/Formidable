// renderer.js

import { setupModal } from "./modules/modalManager.js";
import { setupSplitter } from "./modules/splitter.js";
import { initYamlEditor } from "./modules/yaml_editor.js";
import { createDropdown } from "./modules/dropdownManager.js";
import { initStatusManager, updateStatus } from "./modules/statusManager.js";
import { initFormManager } from "./modules/formManager.js";
import { initMarkdownListManager } from "./modules/markdownListManager.js";
import { log, warn, error } from "./modules/logger.js"; // <- ADD THIS

window.addEventListener("DOMContentLoaded", async () => {
  log("[App] DOM loaded.");

  document.querySelectorAll("button").forEach((btn) => {
    if (!btn.className.includes("btn")) {
      btn.classList.add("btn", "btn-default");
    }
  });

  initStatusManager("status-bar");

  const setupListEl = document.getElementById("setup-list");
  const themeToggle = document.getElementById("theme-toggle");
  const contextToggle = document.getElementById("context-toggle");
  const setupContainer = document.getElementById("setup-container");
  const markdownContainer = document.getElementById("markdown-container");

  const yamlEditor = initYamlEditor(
    "workspace-content",
    async (updatedYaml) => {
      updateStatus(`Saving "${updatedYaml.name}"...`);
      log("[YamlEditor] Save triggered:", updatedYaml);
    }
  );

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

  window.openSettingsModal = settings.show;

  let setupSplitterInitialized = false;
  let markdownSplitterInitialized = false;
  window.currentSelectedTemplate = null;

  const formManager = initFormManager("markdown-content");
  window.formManager = formManager;
  const markdownListManager = initMarkdownListManager(
    () => window.currentSelectedTemplate
  );

  formManager.setReloadMarkdownList(() =>
    markdownListManager.loadMarkdownFiles()
  );
  formManager.connectNewButton("add-markdown", async () => {
    const selectedValue = document.querySelector(
      "#template-selector select"
    )?.value;
    if (!selectedValue) return null;
    return await window.api.loadSetupYaml(selectedValue);
  });

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

  async function selectTemplate(name, { updateDropdown = true } = {}) {
    log("[SelectTemplate] Name:", name);
    if (!name) {
      window.currentSelectedTemplate = null;
      updateStatus("No template selected.");
      warn("[SelectTemplate] Empty selection.");
      return;
    }

    try {
      const yamlData = await window.api.loadSetupYaml(name);
      log("[SelectTemplate] Loaded YAML:", yamlData);

      window.currentSelectedTemplate = yamlData;

      if (updateDropdown) {
        templateDropdown.setSelected(name);
      }

      await window.configAPI.updateUserConfig({ last_selected_template: name });

      await window.api.ensureMarkdownDir(
        window.currentSelectedTemplate.markdown_dir
      ); // << ensure dir

      await formManager.loadTemplate(window.currentSelectedTemplate); // << load form
      await markdownListManager.loadMarkdownFiles(); // << load files

      updateStatus(`Selected template: ${window.currentSelectedTemplate.name}`);
      log("[SelectTemplate] Finished loading template:", name);
    } catch (err) {
      error("[SelectTemplate] Error:", err);
      updateStatus("Error selecting template.");
    }
  }

  async function loadSetupSidebar() {
    const selectedSetup = config.recent_setups?.[0] || null;
    const setupFiles = await window.api.getSetupList();
    setupListEl.innerHTML = "";

    setupFiles.forEach((name) => {
      const item = document.createElement("div");
      item.className = "setup-item";
      item.textContent = name;
      if (name === selectedSetup) {
        item.style.fontWeight = "bold";
      }
      item.addEventListener("click", async () => {
        const data = await window.api.loadSetupYaml(name);
        yamlEditor.render(data);
        await window.configAPI.updateUserConfig({ recent_setups: [name] });
        updateStatus(`Loaded setup: ${name}`);
      });
      setupListEl.appendChild(item);
    });

    if (selectedSetup) {
      try {
        const autoData = await window.api.loadSetupYaml(selectedSetup);
        yamlEditor.render(autoData);
      } catch (err) {
        warn("[SetupList] Failed to autoload:", err.message);
      }
    }
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

  async function loadTemplateOptions() {
    log("[LoadTemplates] Getting templates...");
    const setupFiles = await window.api.getSetupList();
    log("[LoadTemplates] Setup files:", setupFiles);

    const options = setupFiles.map((name) => ({
      value: name,
      label: name.replace(/\.yaml$/, ""),
    }));

    templateDropdown.updateOptions(options);

    const config = await window.configAPI.loadUserConfig();
    log("[LoadTemplates] Config loaded:", config);

    if (config.last_selected_template) {
      log("[LoadTemplates] Autoloading:", config.last_selected_template);
      await selectTemplate(config.last_selected_template, {
        updateDropdown: false,
      });

      if (
        config.context_mode === "markdown" &&
        window.currentSelectedTemplate
      ) {
        log("[LoadTemplates] Loading markdown files after autoload.");
        await window.api.ensureMarkdownDir(
          window.currentSelectedTemplate.markdown_dir
        );
        await markdownListManager.loadMarkdownFiles(); // <<== MISSING!
      }
    }
  }

  const config = await window.configAPI.loadUserConfig();
  if (config.theme === "dark") {
    document.body.classList.add("dark-mode");
  }

  await loadTemplateOptions();
  await loadSetupSidebar();

  setContextView(config.context_mode);

  // 🧹 Clean handling: if in markdown mode, always reload markdown list
  if (config.context_mode === "markdown") {
    if (window.currentSelectedTemplate) {
      log("[Startup] Context is markdown — loading markdown files...");
      await markdownListManager.loadMarkdownFiles();
    } else {
      warn("[Startup] Markdown context, but no selected template.");
    }
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
      await markdownListManager.loadMarkdownFiles();
    }

    updateStatus(
      `Context set to ${mode === "markdown" ? "Markdown" : "Setup"}`
    );
  });
});
