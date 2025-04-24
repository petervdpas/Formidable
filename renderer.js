import { setupModal } from "./modules/modalManager.js";
import { setupSplitter } from "./modules/splitter.js";
import { initYamlEditor } from "./modules/yaml_editor.js";

window.addEventListener("DOMContentLoaded", async () => {
  const setupListEl = document.getElementById("setup-list");
  const themeToggle = document.getElementById("theme-toggle");
  const contextToggle = document.getElementById("context-toggle");
  const statusBar = document.getElementById("status-bar");

  const setupContainer = document.getElementById("setup-container");
  const markdownContainer = document.getElementById("markdown-container");

  const yamlEditor = initYamlEditor("workspace-content", async (updatedYaml) => {
    updateStatus(`Saving "${updatedYaml.name}"...`);
    console.log("To save:", updatedYaml);
  });

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

  const config = await window.configAPI.loadUserConfig();
  if (config.theme === "dark") {
    document.body.classList.add("dark-mode");
  }

  let setupSplitterInitialized = false;
  let markdownSplitterInitialized = false;

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
  }

  setContextView(config.context_mode);

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
      console.warn("Failed to auto-load previous setup:", err.message);
    }
  }

  themeToggle.addEventListener("change", async (e) => {
    const isDark = e.target.checked;
    document.body.classList.toggle("dark-mode", isDark);
    await window.configAPI.updateUserConfig({ theme: isDark ? "dark" : "light" });
    updateStatus(`Theme set to ${isDark ? "Dark" : "Light"}`);
  });

  contextToggle.addEventListener("change", async (e) => {
    const mode = e.target.checked ? "markdown" : "setup";
    await window.configAPI.updateUserConfig({ context_mode: mode });
    setContextView(mode);
    updateStatus(`Context set to ${mode === "markdown" ? "Markdown" : "Setup"}`);
  });

  function updateStatus(message) {
    if (statusBar) {
      statusBar.textContent = message;
    }
  }
});
