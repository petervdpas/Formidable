// modules/templateSelector.js

import { updateStatus } from "./statusManager.js";
import { log, error } from "./logger.js";

export function createTemplateSelector({
  formManager,
  metaListManager,
  templateDropdown,
}) {
  async function selectTemplate(
    name,
    { updateDropdown = true, updateSidebar = true } = {}
  ) {
    if (!name || name === window.currentSelectedTemplateName) return;

    try {
      const result = await window.api.templates.getTemplateDescriptor(name);
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

      if (updateSidebar) {
        // Highlight matching item in the template list
        const sidebarItems = document.querySelectorAll(
          "#template-list .template-item"
        );
        sidebarItems.forEach((el) => {
          const normalized = el.textContent.trim().toLowerCase();
          const match = name.replace(/\.yaml$/, "").toLowerCase();
          if (normalized === match) {
            el.classList.add("selected");
          } else {
            el.classList.remove("selected");
          }
        });
      }

      await window.api.config.updateUserConfig({
        last_selected_template: name,
      });
      await window.api.markdown.ensureMarkdownDir(result.markdownDir);
      await formManager.loadTemplate(yamlData);
      await metaListManager.loadList();
      updateStatus(`Selected template: ${yamlData.name}`);
    } catch (err) {
      error("[SelectTemplate] Error:", err);
      updateStatus("Error selecting template.");
    }
  }

  async function loadTemplateOptions() {
    const templateFiles = await window.api.templates.listTemplates();
    const options = templateFiles.map((name) => ({
      value: name,
      label: name.replace(/\.yaml$/, ""),
    }));
    templateDropdown.updateOptions(options);

    const config = await window.api.config.loadUserConfig();
    const lastSelected = config.last_selected_template;

    if (lastSelected && templateFiles.includes(lastSelected)) {
      await selectTemplate(lastSelected, { updateDropdown: false });
    } else if (options.length > 0) {
      const fallback = options[0].value;
      log(`[loadTemplateOptions] Falling back to: ${fallback}`);
      await selectTemplate(fallback, { updateDropdown: false });
      await window.api.config.updateUserConfig({
        last_selected_template: fallback,
      });
    } else {
      log("[loadTemplateOptions] No templates available to select.");
    }
  }

  return { selectTemplate, loadTemplateOptions };
}
