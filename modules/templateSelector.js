// modules/templateSelector.js

import { EventBus } from "./eventBus.js";
import { log, error } from "./logger.js";
import { stripYamlExtension } from "../utils/pathUtils.js";
import { selectLastOrFallback } from "../utils/configUtils.js";

export function createTemplateSelector({
  formManager,
  metaListManager,
  templateDropdown,
}) {
  async function selectTemplate(name) {
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

      EventBus.emit("template:selected", {
        name,
        yaml: yamlData,
      });

      await window.api.config.updateUserConfig({
        last_selected_template: name,
      });
      await window.api.markdown.ensureMarkdownDir(result.markdownDir);
      await formManager.loadTemplate(yamlData);
      await metaListManager.loadList();
      EventBus.emit("status:update", `Selected template: ${yamlData.name}`);
    } catch (err) {
      error("[SelectTemplate] Error:", err);
      EventBus.emit("status:update", "Error selecting template.");
    }
  }

  async function loadTemplateOptions() {
    const templateFiles = await window.api.templates.listTemplates();
    const options = templateFiles.map((name) => ({
      value: name,
      label: stripYamlExtension(name),
    }));
  
    templateDropdown.updateOptions(options);
  
    const config = await window.api.config.loadUserConfig();
  
    await selectLastOrFallback({
      options: options.map((opt) => opt.value),
      lastSelected: config.last_selected_template,
      configKey: "last_selected_template",
      onSelect: async (name) => {
        await selectTemplate(name);
      },
      onFallback: (fallback) => {
        log(`[loadTemplateOptions] Falling back to: ${fallback}`);
      },
    });
  }

  return { selectTemplate, loadTemplateOptions };
}
