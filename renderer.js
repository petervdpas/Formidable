// renderer.js

import { buildMenu } from "./modules/menuManager.js";
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

  buildMenu("app-menu");
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
    width: "30em",
    height: "auto",
    onOpen: async () => {
      const config = await window.configAPI.loadUserConfig();
      themeToggle.checked = config.theme === "dark";
      contextToggle.checked = config.context_mode === "markdown";

      const defaultDirInput = document.getElementById("default-dir");
      const chooseDirBtn = document.getElementById("choose-dir");

      defaultDirInput.value = config.default_markdown_dir || "./markdowns";

      chooseDirBtn.onclick = async () => {
        const selected = await window.dialogAPI.chooseDirectory();
        if (selected) {
          // Convert to relative path
          const appRoot = (await window.api.getAppRoot?.()) || ".";

          const relativePath = selected.startsWith(appRoot)
            ? "./" +
              selected
                .slice(appRoot.length)
                .replace(/^[\\/]/, "")
                .replace(/\\/g, "/")
            : selected; // fallback to absolute if not under root

          defaultDirInput.value = relativePath;
          await window.configAPI.updateUserConfig({
            default_markdown_dir: relativePath,
          });
          updateStatus(`Updated default markdown dir: ${relativePath}`);
        }
      };
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
    onRefresh: async () => {
      const templates = await window.api.listTemplateFiles();
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

  async function selectTemplate(name, { updateDropdown = true } = {}) {
    if (!name || name === window.currentSelectedTemplateName) return;

    try {
      const result = await window.api.getTemplateDescriptor(name);
      if (!result || !result.yaml) {
        throw new Error(
          `Template descriptor missing or malformed for: ${name}`
        );
      }

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
    const lastSelected = config.last_selected_template;

    if (lastSelected && templateFiles.includes(lastSelected)) {
      await selectTemplate(lastSelected, { updateDropdown: false });
    } else if (options.length > 0) {
      const fallback = options[0].value;
      log(`[loadTemplateOptions] Falling back to: ${fallback}`);
      await selectTemplate(fallback, { updateDropdown: false });
      await window.configAPI.updateUserConfig({
        last_selected_template: fallback,
      });
    } else {
      log("[loadTemplateOptions] No templates available to select.");
    }
  }

  await loadTemplateOptions();
  await templateListManager.loadList();
  await templateDropdown.refresh?.();

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
    if (mode === "markdown") {
      await templateDropdown.refresh?.(); // always refresh
      if (window.currentSelectedTemplate) {
        await metaListManager.loadList();
      }
    }
    updateStatus(
      `Context set to ${mode === "markdown" ? "Markdown" : "Template"}`
    );
  });
});
