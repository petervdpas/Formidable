// /modules/sidebarManager.js

import { EventBus } from "./eventBus.js";
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

      // ➡️ Now add the extra button, if requested
      if (addButton) {
        const btn = document.createElement("button");
        btn.textContent = addButton.label || "+ Add New";
        btn.className = "btn btn-default btn-add-item"; // you can style this nicely
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

// --- Internal prompt for template creation ---
function promptForTemplateName(modal, defaultMarkdownDir, callback) {
  const nameInput = document.getElementById("template-name");
  const dirInput = document.getElementById("template-dir");
  const confirmBtn = document.getElementById("template-confirm");

  nameInput.value = "";
  dirInput.value = defaultMarkdownDir;

  function updateDirValue() {
    const raw = nameInput.value.trim();
    const safeName = raw.replace(/\s+/g, "-").toLowerCase();
    if (safeName) {
      dirInput.value = `${defaultMarkdownDir}/${safeName}`;
    } else {
      dirInput.value = "./markdowns";
    }
  }

  // 🔁 Prevent stacking duplicate listeners:
  nameInput.removeEventListener("input", updateDirValue);
  nameInput.addEventListener("input", updateDirValue);

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

// ─── Public Init Functions ───
export function initTemplateListManager(
  yamlEditor,
  modal,
  defaultMarkdownDir = "./markdowns",
  dropdown = null
) {
  let listManager = null;

  listManager = createListManager({
    elementId: "template-list",
    fetchListFunction: async () => await window.api.templates.listTemplates(),
    onItemClick: async (itemName) => {
      try {
        const data = await window.api.templates.loadTemplate(itemName);
        yamlEditor.render(data);

        EventBus.emit("template:selected", {
          name: itemName,
          yaml: data,
        });

        await window.api.config.updateUserConfig({
          selected_template: itemName,
        });

        EventBus.emit("status:update", `Loaded Template: ${itemName}`);
      } catch (err) {
        error("[TemplateList] Failed to load template:", err);
        EventBus.emit("status:update", "Error loading template.");
      }
    },
    emptyMessage: "No template files found.",
    addButton: {
      label: "+ Add Template",
      onClick: async () => {
        promptForTemplateName(
          modal,
          defaultMarkdownDir,
          async ({ filename, yaml }) => {
            try {
              await window.api.templates.saveTemplate(filename, yaml);
              await listManager.loadList();

              if (dropdown?.refresh) {
                await dropdown.refresh();
              }

              await window.api.config.updateUserConfig({
                selected_template: filename,
              });

              yamlEditor.render(yaml);
              EventBus.emit("template:selected", {
                name: filename,
                yaml,
              });
              EventBus.emit("status:update", `Created new template: ${filename}`);

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
  return createListManager({
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
    onItemClick: async (entryName) => {
      try {
        const template = window.currentSelectedTemplate;
        if (!template) {
          warn("[MetaList] No template selected when clicking item.");
          return;
        }
        const dir = template.markdown_dir;
        const data = await window.api.forms.loadForm(
          dir,
          entryName,
          template.fields || []
        );
        if (!data) {
          EventBus.emit("status:update", "Failed to load metadata entry.");
          return;
        }
        await formManager.loadFormData(data, entryName);
        EventBus.emit("status:update", `Loaded metadata: ${entryName}`);
      } catch (err) {
        error("[MetaList] Failed to load entry:", err);
        EventBus.emit("status:update", "Error loading metadata.");
      }
    },
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
        promptForEntryName(modal, async (filename) => {
          log("[AddMarkdown] Creating new entry:", filename);
          await formManager.loadFormData({}, filename);
          EventBus.emit("status:update", "New metadata entry ready.");
        });
      },
    },
  });
}
