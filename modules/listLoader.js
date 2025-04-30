// modules/listLoader.js

import { createListManager } from "./listManager.js";
import { updateStatus } from "./statusManager.js";
import { log, warn, error } from "./logger.js";

// --- Internal prompt for template creation ---
function promptForTemplateName(modal, callback) {
  const nameInput = document.getElementById("template-name");
  const dirInput = document.getElementById("template-dir");
  const confirmBtn = document.getElementById("template-confirm");

  nameInput.value = "";
  dirInput.value = "./markdowns";

  // 👇 Automatically update markdown dir when typing filename
  nameInput.addEventListener("input", () => {
    const raw = nameInput.value.trim();
    const safeName = raw.replace(/\s+/g, "-").toLowerCase();
    if (safeName) {
      dirInput.value = `./markdowns/${safeName}`;
    } else {
      dirInput.value = "./markdowns";
    }
  });

  confirmBtn.onclick = async () => {
    const raw = nameInput.value.trim();
    if (!raw) return;

    const safeName = raw.replace(/\s+/g, "-").toLowerCase();
    const filename = `${safeName}.yaml`;
    const markdown_dir = dirInput.value.trim() || "markdown";

    modal.hide();

    callback({
      filename,
      yaml: {
        name: safeName,
        markdown_dir,
        fields: [],
      },
    });
  };

  modal.show();
  setTimeout(() => nameInput.focus(), 100);
}

// --- Internal prompt for metadata entry creation ---
function promptForEntryName(modal, callback) {
  const input = document.getElementById("entry-name");
  const checkbox = document.getElementById("entry-append-date");
  const confirm = document.getElementById("entry-confirm");

  input.value = "";
  checkbox.checked = true;

  confirm.onclick = () => {
    const raw = input.value.trim();
    if (!raw) return;

    const sanitized = raw.replace(/\s+/g, "-").toLowerCase();
    const appendDate = checkbox.checked;

    let finalName = sanitized;
    if (appendDate) {
      const now = new Date();
      const formatted = now.toISOString().slice(0, 10).replaceAll("-", "");
      finalName = `${sanitized}-${formatted}`;
    }

    modal.hide();
    callback(finalName);
  };

  modal.show();
  setTimeout(() => input.focus(), 100);
}

export function initTemplateListManager(yamlEditor, modal) {
  let listManager = null;

  listManager = createListManager({
    elementId: "template-list",
    fetchListFunction: async () => await window.api.listTemplateFiles(),
    onItemClick: async (itemName) => {
        try {
          const data = await window.api.loadTemplateFile(itemName);
          yamlEditor.render(data);

          window.currentSelectedTemplate = data;
          window.currentSelectedTemplateName = itemName;
      
          await window.configAPI.updateUserConfig({ recent_templates: [itemName] });
          updateStatus(`Loaded Template: ${itemName}`);
        } catch (err) {
          error("[TemplateList] Failed to load template:", err);
          updateStatus("Error loading template.");
        }
      },
    emptyMessage: "No template files found.",
    addButton: {
      label: "+ Add Template",
      onClick: async () => {
        promptForTemplateName(modal, async ({ filename, yaml }) => {
          try {
            await window.api.saveTemplateFile(filename, yaml);
            await listManager.loadList();
            await window.configAPI.updateUserConfig({ recent_templates: [filename] });
            
            window.currentSelectedTemplate = yaml;
            window.currentSelectedTemplateName = filename;
            
            yamlEditor.render(yaml);
            updateStatus(`Created new template: ${filename}`);
          } catch (err) {
            error("[AddTemplate] Failed to save:", err);
            updateStatus("Error creating new template.");
          }
        });
      },
    },
  });

  return listManager;
}

export function initMetaListManager(formManager, modal) {
  return createListManager({
    elementId: "markdown-list",
    fetchListFunction: async () => {
      const template = window.currentSelectedTemplate;
      if (!template) {
        warn("[MetaList] No selected template.");
        updateStatus("No template selected.");
        return [];
      }
      if (!template.markdown_dir) {
        warn("[MetaList] No markdown_dir field.");
        updateStatus("Template missing markdown_dir field.");
        return [];
      }
      await window.api.ensureMarkdownDir(template.markdown_dir);
      const files = await window.api.listMeta(template.markdown_dir);
      return files.map((f) => f.replace(/\.meta\.json$/, ""));
    },
    onItemClick: async (entryName) => {
      try {
        const template = window.currentSelectedTemplate;
        if (!template) {
          warn("[MetaList] No template selected when clicking item.");
          return;
        }
        const dir = template.markdown_dir;
        const data = await window.api.loadMeta(dir, entryName);
        if (!data) {
          updateStatus("Failed to load metadata entry.");
          return;
        }
        await formManager.loadFormData(data, entryName);
        updateStatus(`Loaded metadata: ${entryName}`);
      } catch (err) {
        error("[MetaList] Failed to load entry:", err);
        updateStatus("Error loading metadata.");
      }
    },
    emptyMessage: "No metadata files found.",
    addButton: {
      label: "+ Add Entry",
      onClick: async () => {
        const template = window.currentSelectedTemplate;
        if (!template) {
          warn("[AddMarkdown] No template selected.");
          updateStatus("Please select a template first.");
          return;
        }
        promptForEntryName(modal, async (filename) => {
          log("[AddMarkdown] Creating new entry:", filename);
          await formManager.loadFormData({}, filename);
          updateStatus("New metadata entry ready.");
        });
      },
    },
  });
}
