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
import {
  stripMetaExtension,
} from "../utils/pathUtils.js";
import { highlightAndClickMatch } from "../utils/domUtils.js";

// ─── Public Init Functions ───
export function createTemplateListManager(
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
          async ({ template, yaml }) => {
            try {
              await window.api.templates.saveTemplate(template, yaml);
              await listManager.loadList();

              if (dropdown?.refresh) {
                await dropdown.refresh();
              }

              yamlEditor.render(yaml);

              EventBus.emit("template:selected", { name: template, yaml });
              EventBus.emit(
                "status:update",
                `Created new template: ${template}`
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

  EventBus.on("template:list:reload", async () => {
    await listManager.loadList();
  });

  EventBus.on("template:list:highlighted", (name) => {
    if (!name) return;
    const container = document.getElementById("template-list");
    highlightAndClickMatch(container, name);
  });

  return listManager;
}

export function createMetaListManager(formManager, modal) {
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
      return files.map(stripMetaExtension);
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

        handleEntryConfirm(modal, async (datafile) => {
          log("[AddMarkdown] Creating new entry:", datafile);
          await formManager.loadFormData({}, datafile);
          EventBus.emit("status:update", "New metadata entry ready.");
        });
      },
    },
  });

  EventBus.on("meta:list:reload", async () => {
    await listManager.loadList();
  });

  EventBus.on("form:list:highlighted", (name) => {
    if (!name) return;
    const container = document.getElementById("markdown-list");
    highlightAndClickMatch(container, name);
  });

  return listManager;
}
