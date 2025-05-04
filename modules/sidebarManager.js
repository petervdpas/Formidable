// /modules/sidebarManager.js

import { createListManager } from "./listManager.js";
import { EventBus } from "./eventBus.js";
import {
  handleTemplateClick,
  handleTemplateConfirm,
  handleEntryClick,
  handleEntryConfirm,
} from "./handlers.js";
import { log, warn, error } from "./logger.js";

// ─── Public Init Functions ───
export function initTemplateListManager(
  yamlEditor,
  modal,
  defaultMarkdownDir = "./markdowns",
  dropdown = null
) {
  const listManager = createListManager({
    elementId: "template-list",
    fetchListFunction: async () => await window.api.templates.listTemplates(),
    onItemClick: (itemName) => handleTemplateClick(itemName, yamlEditor),
    emptyMessage: "No template files found.",
    addButton: {
      label: "+ Add Template",
      onClick: async () => {
        handleTemplateConfirm(
          modal,
          defaultMarkdownDir,
          async ({ filename, yaml }) => {
            try {
              await window.api.templates.saveTemplate(filename, yaml);
              await listManager.loadList();

              if (dropdown?.refresh) {
                await dropdown.refresh();
              }

              yamlEditor.render(yaml);

              EventBus.emit("template:selected", { name: filename, yaml });
              EventBus.emit(
                "status:update",
                `Created new template: ${filename}`
              );
            } catch (err) {
              error("[AddTemplate] Failed to save:", err);
              EventBus.emit("status:update", "Error creating new template.");
            }
          }
        );
      },
    },
  });

  return listManager;
}

export function initMetaListManager(formManager, modal) {
  const listManager = createListManager({
    elementId: "markdown-list",
    fetchListFunction: async () => {
      const template = window.currentSelectedTemplate;
      if (!template) {
        warn("[MetaList] No selected template.");
        EventBus.emit("status:update", "No template selected.");
        return [];
      }

      if (!template.markdown_dir) {
        warn("[MetaList] No markdown_dir field.");
        EventBus.emit("status:update", "Template missing markdown_dir field.");
        return [];
      }

      await window.api.forms.ensureFormDir(template.markdown_dir);
      const files = await window.api.forms.listForms(template.markdown_dir);
      return files.map((f) => f.replace(/\.meta\.json$/, ""));
    },
    onItemClick: (entryName) => handleEntryClick(entryName, formManager),
    emptyMessage: "No metadata files found.",
    addButton: {
      label: "+ Add Entry",
      onClick: async () => {
        const template = window.currentSelectedTemplate;
        if (!template) {
          warn("[AddMarkdown] No template selected.");
          EventBus.emit("status:update", "Please select a template first.");
          return;
        }

        handleEntryConfirm(modal, async (filename) => {
          log("[AddMarkdown] Creating new entry:", filename);
          await formManager.loadFormData({}, filename);
          EventBus.emit("form:selected", filename);
          EventBus.emit("status:update", "New metadata entry ready.");
        });
      },
    },
  });

  return listManager;
}
