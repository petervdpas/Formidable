// /modules/sidebarManager.js

import { EventBus } from "./eventBus.js";
import {
  handleTemplateClick,
  handleTemplateConfirm,
  handleEntryClick,
  handleEntryConfirm,
} from "./handlers.js";
import { log, warn, error } from "./logger.js";

// ─── Internal: Shared List Creator ───
function createListManager({
  elementId,
  fetchListFunction,
  onItemClick,
  emptyMessage = "No items.",
  addButton = null,
}) {
  const container = document.getElementById(elementId);
  if (!container) {
    error(`[ListManager] Element not found: #${elementId}`);
    throw new Error(`List container #${elementId} not found.`);
  }

  async function loadList() {
    log(`[ListManager] Loading list into #${elementId}...`);
    container.innerHTML = "";
    let selectedItem = null;
    try {
      const items = await fetchListFunction();
      log("[ListManager] Items:", items);

      if (!items || items.length === 0) {
        container.innerHTML = `<div class="empty-message">${emptyMessage}</div>`;
      } else {
        items.forEach((itemName) => {
          const item = document.createElement("div");
          item.className = "template-item";
          item.textContent = itemName.replace(/\.yaml$|\.md$/i, "");

          item.addEventListener("click", () => {
            if (selectedItem) {
              selectedItem.classList.remove("selected");
            }
            item.classList.add("selected");
            selectedItem = item;

            onItemClick(itemName);
          });

          container.appendChild(item);
        });
      }

      if (addButton) {
        const btn = document.createElement("button");
        btn.textContent = addButton.label || "+ Add New";
        btn.className = "btn btn-default btn-add-item";
        btn.addEventListener("click", addButton.onClick);

        container.appendChild(btn);
      }

      EventBus.emit("status:update", `Loaded ${items.length} item(s).`);
    } catch (err) {
      error("[ListManager] Failed to load list:", err);
      container.innerHTML =
        "<div class='empty-message'>Error loading list.</div>";
      EventBus.emit("status:update", "Error loading list.");
    }
  }

  return { loadList };
}

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
