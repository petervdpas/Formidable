// modules/handlers/templateHandlers.js

import { EventBus } from "../eventBus.js";

let formManager = null;
let metaListManager = null;
let templateEditor = null;

let lastSelectedTemplate = null;
let lastSelectedTime = 0;
let isRenderingTemplate = false;

// 🔗 Inject dependencies from renderer.js
export function bindTemplateDependencies(deps) {
  formManager = deps.formManager;
  metaListManager = deps.metaListManager;
  templateEditor = deps.templateEditor;
}

// SELECTED
export async function handleTemplateSelected({ name, yaml }) {
  const now = Date.now();

  if (isRenderingTemplate) {
    EventBus.emit("logging:warning", [
      "[Handler] Already rendering template, ignoring:", name
    ]);
    return;
  }

  if (name === lastSelectedTemplate && (now - lastSelectedTime) < 2000) {
    EventBus.emit("logging:warning", [
      "[Handler] Duplicate template:selected ignored:", name
    ]);
    return;
  }

  lastSelectedTemplate = name;
  lastSelectedTime = now;
  isRenderingTemplate = true;

  try {
    EventBus.emit("logging:default", [
      "[Handler] template:selected received:", name
    ]);

    window.currentSelectedTemplateName = name;
    window.currentSelectedTemplate = yaml;

    if (templateEditor) {
      templateEditor.render(yaml);
    }

    const config = await new Promise((resolve) => {
      EventBus.emit("config:load", (cfg) => resolve(cfg));
    });

    const templateChanged = config.selected_template !== name;

    if (templateChanged) {
      EventBus.emit("config:update", { selected_template: name });
      EventBus.emit("form:selected", null); // clear form selection
    }

    if (formManager && metaListManager) {
      await formManager.loadTemplate(yaml);
      await metaListManager.loadList();

      const config = await new Promise((resolve) => {
        EventBus.emit("config:load", (cfg) => resolve(cfg));
      });
      const lastDataFile = config.selected_data_file;

      if (lastDataFile) {
        EventBus.emit("form:list:highlighted", lastDataFile);
      }
    }

    const el = document.querySelector(`#template-list [data-value="${name}"]`);
    if (!el || !el.classList.contains("selected")) {
      EventBus.emit("template:list:highlighted", name);
    }
  } finally {
    isRenderingTemplate = false;
  }
}

// LIST
export async function handleListTemplates({ callback }) {
  try {
    const result = await window.api.templates.listTemplates();
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[TemplateHandler] Failed to list templates:",
      err,
    ]);
    callback?.([]);
  }
}

// LOAD
export async function handleLoadTemplate({ name, callback }) {
  try {
    const result = await window.api.templates.loadTemplate(name);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[TemplateHandler] Failed to load template "${name}":`,
      err,
    ]);
    callback?.(null);
  }
}

// SAVE
export async function handleSaveTemplate({ name, data, callback }) {
  try {
    const result = await window.api.templates.saveTemplate(name, data);
    if (result) {
      EventBus.emit("status:update", `Saved template: ${name}`);

      const templateName = name.replace(/\.yaml$/, "");
      EventBus.emit("vfs:refreshTemplate", { templateName });
    } else {
      EventBus.emit("status:update", `Failed to save template: ${name}`);
    }
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[TemplateHandler] Failed to save template "${name}":`,
      err,
    ]);
    callback?.(false);
  }
}

// DELETE
export async function handleDeleteTemplate({ name, callback }) {
  try {
    const result = await window.api.templates.deleteTemplate(name);
    if (result) {
      const templateName = name.replace(/\.yaml$/, "");
      EventBus.emit("cache:delete", {
        storeName: "vfs",
        key: `template:${templateName}`,
      });
    }
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[TemplateHandler] Failed to delete template "${name}":`,
      err,
    ]);
    callback?.(false);
  }
}

// VALIDATE
export async function handleValidateTemplate({ data, callback }) {
  try {
    const result = await window.api.templates.validateTemplate(data);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[TemplateHandler] Failed to validate template`,
      err,
    ]);
    callback?.([]);
  }
}

// DESCRIPTOR
export async function handleGetTemplateDescriptor({ name, callback }) {
  try {
    if (typeof name !== "string" || name.trim() === "") {
      EventBus.emit("logging:error", [
        `[TemplateHandler] Invalid template name (not a string):`,
        name,
      ]);
      callback?.(null);
      return;
    }

    const safeName = name.endsWith(".yaml") ? name : `${name}.yaml`;
    const result = await window.api.templates.getTemplateDescriptor(safeName);

    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[TemplateHandler] Failed to get descriptor for "${name}":`,
      err,
    ]);
    callback?.(null);
  }
}
