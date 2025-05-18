// modules/templateSelector.js

import { EventBus } from "./eventBus.js";
import { stripYamlExtension } from "../utils/pathUtils.js";
import { selectLastOrFallback } from "../utils/configUtils.js";

export async function selectTemplate(name) {
  if (!name || name === window.currentSelectedTemplateName) return;

  try {
    EventBus.emit("logging:default", [
      "[SelectTemplate] Selecting template:",
      name,
    ]);
    const result = await window.api.templates.getTemplateDescriptor(name);
    if (!result || !result.yaml) {
      throw new Error(`Template descriptor missing or malformed for: ${name}`);
    }

    const yamlData = result.yaml;

    EventBus.emit("context:select:template", {
      name,
      yaml: yamlData,
    });

    await window.api.config.updateUserConfig({
      selected_template: name,
    });

    await window.api.markdown.ensureMarkdownDir(result.storageLocation);
    EventBus.emit("status:update", `Selected template: ${yamlData.name}`);
  } catch (err) {
    EventBus.emit("logging:error", ["[SelectTemplate] Error:", err]);
    EventBus.emit("status:update", "Error selecting template.");
  }
}

export function createTemplateSelector({ templateDropdown }) {
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
      lastSelected: config.selected_template,
      configKey: "selected_template",
      onSelect: async (name) => {
        await selectTemplate(name);
      },
      onFallback: (fallback) => {
        EventBus.emit("logging:default", [
          `[loadTemplateOptions] Falling back to: ${fallback}`,
        ]);
      },
    });
  }

  return { selectTemplate, loadTemplateOptions };
}
