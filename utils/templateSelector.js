// utils/templateSelector.js

import { EventBus } from "../modules/eventBus.js";
import { stripYamlExtension } from "./pathUtils.js";
import { selectLastOrFallback } from "./configUtils.js";

export function createTemplateSelector({ templateDropdown }) {
  async function selectTemplate(name) {
    if (!name || name === window.currentSelectedTemplateName) return;

    try {
      EventBus.emit("logging:default", [
        "[SelectTemplate] Selecting template:",
        name,
      ]);

      const result = await new Promise((resolve) => {
        EventBus.emit("template:descriptor", {
          name,
          callback: resolve,
        });
      });

      if (!result?.yaml) {
        throw new Error(`Template descriptor missing or malformed for: ${name}`);
      }

      // USE LOCAL REFERENCE, not window.*
      templateDropdown?.setSelected?.(name);

      EventBus.emit("template:selected", {
        name,
        yaml: result.yaml,
      });
    } catch (err) {
      EventBus.emit("logging:error", ["[SelectTemplate] Error:", err]);
      EventBus.emit("status:update", "Error selecting template.");
    }
  }

  async function loadTemplateOptions() {
    const templateFiles = await new Promise((resolve) => {
      EventBus.emit("template:list", { callback: resolve });
    });
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