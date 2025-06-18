// modules/handlers/vfsHandler.js

import { EventBus } from "../eventBus.js";

let vfsInitialized = false;

// ─────────────────────────────────────────────
// Load base context paths (context, templates, storage)
// ─────────────────────────────────────────────
async function loadContextPaths() {
  const vfs = await window.api.config.getVirtualStructure();

  await EventBus.emit("cache:put", {
    storeName: "vfs",
    item: { id: "contextPath", value: vfs.context },
  });

  await EventBus.emit("cache:put", {
    storeName: "vfs",
    item: { id: "templatesPath", value: vfs.templates },
  });

  await EventBus.emit("cache:put", {
    storeName: "vfs",
    item: { id: "storagePath", value: vfs.storage },
  });

  EventBus.emit("logging:default", ["[VFSHandler] Cached context paths."]);
}

// ─────────────────────────────────────────────
// Load all templates and their associated folders/files
// ─────────────────────────────────────────────
async function loadTemplateEntries() {
  const vfs = await window.api.config.getVirtualStructure();

  const entries = Object.entries(vfs.templateStorageFolders);
  for (const [templateName, info] of entries) {
    const entry = {
      id: `template:${templateName}`,
      name: templateName,
      filename: `${templateName}.yaml`,
      ...info,
    };

    await EventBus.emit("cache:put", { storeName: "vfs", item: entry });
  }

  EventBus.emit("logging:default", [
    `[VFSHandler] Cached ${entries.length} template entries.`,
  ]);
}

// ─────────────────────────────────────────────
// Load selected template, selected form, context mode
// ─────────────────────────────────────────────
async function loadUserSelections() {
  const config = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });

  await EventBus.emit("cache:put", {
    storeName: "vfs",
    item: { id: "selected:template", value: config.selected_template },
  });

  await EventBus.emit("cache:put", {
    storeName: "vfs",
    item: { id: "selected:datafile", value: config.selected_data_file },
  });

  await EventBus.emit("cache:put", {
    storeName: "vfs",
    item: { id: "context:mode", value: config.context_mode },
  });

  EventBus.emit("logging:default", ["[VFSHandler] Cached user selections."]);
}

// ─────────────────────────────────────────────
// Optionally cache full user config object
// ─────────────────────────────────────────────
async function loadUserConfigCache() {
  const config = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });

  await EventBus.emit("cache:put", {
    storeName: "vfs",
    item: { id: "user:config", value: config },
  });

  EventBus.emit("logging:default", ["[VFSHandler] Cached full user config."]);
}

// ─────────────────────────────────────────────
// Initialize and populate the virtual file system cache
// ─────────────────────────────────────────────
export async function initVFS() {
  if (vfsInitialized) {
    EventBus.emit("logging:warning", [
      "[VFSHandler] initVFS() called again — skipping (already initialized).",
    ]);
    return;
  }

  vfsInitialized = true;
  await reloadVFS();
}

// ─────────────────────────────────────────────
// Rebuild VFS: clear, then repopulate all caches
// ─────────────────────────────────────────────
export async function reloadVFS() {
  try {
    await clearVFS();

    await loadContextPaths();
    await loadTemplateEntries();
    await loadUserSelections();
    await loadUserConfigCache();

    EventBus.emit("logging:default", ["[VFSHandler] Reloaded VFS."]);
  } catch (err) {
    EventBus.emit("logging:error", ["[VFSHandler] Failed to reload VFS:", err]);
  }
}

// ─────────────────────────────────────────────
// Utility: Update a single VFS key/value
// ─────────────────────────────────────────────
export async function updateVFSKey({ id, value }) {
  console.log("[VFSHandler] updateVFSKey called:", id, value);
  try {
    await EventBus.emit("cache:put", {
      storeName: "vfs",
      item: { id, value },
    });
    EventBus.emit("logging:default", [
      `[VFSHandler] Updated key "${id}" in VFS.`,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[VFSHandler] Failed to update "${id}":`,
      err,
    ]);
  }
}

// ─────────────────────────────────────────────
// Utility: Delete a VFS key
// ─────────────────────────────────────────────
export async function deleteVFSKey(id) {
  try {
    await EventBus.emit("cache:delete", {
      storeName: "vfs",
      key: id,
    });

    EventBus.emit("logging:default", [
      `[VFSHandler] Deleted key "${id}" from VFS.`,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[VFSHandler] Failed to delete key "${id}":`,
      err,
    ]);
  }
}

// ─────────────────────────────────────────────
// Utility: Clear all VFS cache entries
// ─────────────────────────────────────────────
export async function clearVFS() {
  try {
    await EventBus.emit("cache:clear", { storeName: "vfs" });

    EventBus.emit("logging:default", [
      `[VFSHandler] Cleared all entries from VFS.`,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", ["[VFSHandler] Failed to clear VFS:", err]);
  }
}

// ─────────────────────────────────────────────
// Specialized: Refresh a single template entry
// ─────────────────────────────────────────────
export async function refreshTemplateEntry({ templateName }) {
  if (!templateName) {
    EventBus.emit("logging:warning", [
      "[VFSHandler] refreshTemplateEntry called without templateName.",
    ]);
    return;
  }

  try {
    const entry = await new Promise((resolve) => {
      EventBus.emit("config:template:singleEntry", {
        templateName,
        callback: resolve,
      });
    });

    if (!entry) {
      EventBus.emit("logging:warning", [
        `[VFSHandler] No entry returned for template "${templateName}".`,
      ]);
      return;
    }

    await EventBus.emit("cache:put", {
      storeName: "vfs",
      item: entry,
    });

    EventBus.emit("logging:default", [
      `[VFSHandler] Refreshed VFS entry: template:${templateName}`,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[VFSHandler] Failed to refresh template entry "${templateName}":`,
      err,
    ]);
  }
}

// ─────────────────────────────────────────────
// Specialized: Handle list templates for UI
// ─────────────────────────────────────────────
export async function handleListTemplates(_, callback) {
  try {
    const vfs = await window.api.config.getVirtualStructure();
    const list = Object.keys(vfs.templateStorageFolders).map((name) => ({
      name,
      filename: vfs.templateStorageFolders[name].filename,
    }));
    callback(list);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[VFSHandler] Error in handleListTemplates:`,
      err,
    ]);
    callback([]); // fallback empty list
  }
}

// ─────────────────────────────────────────────
// Specialized: Get template meta files for UI
// ─────────────────────────────────────────────
export async function handleGetTemplateMetaFiles({ templateName }, callback) {
  try {
    const cleanName = templateName.replace(/\.yaml$/i, "");
    const metaFiles = await window.api.config.getTemplateMetaFiles(`${cleanName}.yaml`);
    callback(metaFiles);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[VFSHandler] Error in handleGetTemplateMetaFiles for "${templateName}":`,
      err,
    ]);
    callback([]); 
  }
}
