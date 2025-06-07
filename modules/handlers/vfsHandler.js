// modules/handlers/vfsHandler.js

import { EventBus } from "../eventBus.js";

let vfsInitialized = false;

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

export async function reloadVFS() {
  try {
    await EventBus.emit("cache:clear", { storeName: "vfs" });

    const vfsObject = await window.api.config.getVirtualStructure();

    const entries = [
      { id: "contextPath", value: vfsObject.context },
      { id: "templatesPath", value: vfsObject.templates },
      { id: "storagePath", value: vfsObject.storage },
      ...Object.entries(vfsObject.templateStorageFolders).map(
        ([templateName, info]) => ({
          id: `template:${templateName}`,
          name: templateName,
          filename: `${templateName}.yaml`,
          ...info,
        })
      ),
    ];

    for (const entry of entries) {
      await EventBus.emit("cache:put", {
        storeName: "vfs",
        item: entry,
      });
    }

    EventBus.emit("logging:default", [
      `[VFSHandler] Reloaded VFS with ${entries.length} entries.`,
    ]);
  } catch (err) {
    EventBus.emit("logging:error", ["[VFSHandler] Failed to reload VFS:", err]);
  }
}

export async function updateVFSKey(id, value) {
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
