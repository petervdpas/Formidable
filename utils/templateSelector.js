// utils/templateSelector.js

import { EventBus } from "../modules/eventBus.js";
import { stripYamlExtension } from "./pathUtils.js";
import { selectLastOrFallback } from "./configUtils.js";

export async function selectTemplate(name) {
  if (!name || name === window.currentSelectedTemplateName) return;

  try {
    EventBus.emit("logging:default", [
      "[SelectTemplate] Selecting template:",
      name,
    ]);

    const result = await window.api.templates.getTemplateDescriptor(name);
    if (!result?.yaml) {
      throw new Error(`Template descriptor missing or malformed for: ${name}`);
    }

    // 🔁 Emit only → full logic is handled in templateHandlers.js
    EventBus.emit("context:select:template", {
      name,
      yaml: result.yaml,
    });
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

    const config = await new Promise((resolve) => {
      EventBus.emit("config:load", (cfg) => resolve(cfg));
    });

    await selectLastOrFallback({
      options: options.map((opt) => opt.value),
      lastSelected: config.selected_template,
      configKey: "selected_template",
      onSelect: selectTemplate,
      onFallback: (fallback) => {
        EventBus.emit("logging:default", [
          `[loadTemplateOptions] Falling back to: ${fallback}`,
        ]);
      },
    });
  }

  return { selectTemplate, loadTemplateOptions };
}
