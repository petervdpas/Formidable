// modules/handlers/configHandler.js

import { EventBus } from "../eventBus.js";

export async function handleConfigLoad(callback) {
  try {
    const config = await window.api.config.loadUserConfig();
    if (typeof callback === "function") {
      callback(config);
    } else {
      EventBus.emit("logging:warning", [
        "[ConfigHandler] config:load called without callback",
      ]);
    }
  } catch (err) {
    EventBus.emit("logging:error", [
      "[ConfigHandler] Failed to load config:",
      err,
    ]);
  }
}

export async function handleConfigUpdate(partial) {
  try {
    await window.api.config.updateUserConfig(partial);

    const keys = Object.keys(partial).join(", ");
    EventBus.emit("logging:default", [
      `[ConfigHandler] Updated user config: ${keys}`,
    ]);

    // Optional: Update VFS entry for selected keys
    if (partial.selected_template) {
      await EventBus.emit("vfs:update", {
        id: "selected:template",
        value: partial.selected_template,
      });
    }

    if (partial.selected_data_file) {
      await EventBus.emit("vfs:update", {
        id: "selected:datafile",
        value: partial.selected_data_file,
      });
    }

    if (partial.context_mode) {
      await EventBus.emit("vfs:update", {
        id: "context:mode",
        value: partial.context_mode,
      });
    }

    if (partial.context_folder) {
      await EventBus.emit("vfs:update", {
        id: "context:folder",
        value: partial.context_folder,
      });
    }

    if (partial.git_root) {
      await EventBus.emit("vfs:update", {
        id: "git:root",
        value: partial.git_root,
      });
    }

    if (partial.theme) {
      EventBus.emit("theme:toggle", partial.theme);
    }
  } catch (err) {
    EventBus.emit("logging:error", [
      "[ConfigHandler] Failed to update user config:",
      err,
    ]);
  }
}

export async function handleGetContextPaths({ callback }) {
  try {
    const contextPath = await window.api.config.getContextPath();
    const templatesPath = await window.api.config.getTemplatesFolder();
    const storagePath = await window.api.config.getStorageFolder();

    callback?.({ contextPath, templatesPath, storagePath });
  } catch (err) {
    EventBus.emit("logging:error", [
      "[ConfigHandler] Failed to get context paths:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGetTemplateStoragePath({
  templateFilename,
  callback,
}) {
  try {
    const path = await window.api.config.getTemplateStorageFolder(
      templateFilename
    );
    callback?.(path);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[ConfigHandler] Failed to get storage path for: ${templateFilename}`,
      err,
    ]);
    callback?.(null);
  }
}

export async function handleGetSingleTemplateEntry({ templateName, callback }) {
  try {
    const entry = await window.api.config.getSingleTemplateEntry(templateName);
    callback?.(entry);
  } catch (err) {
    EventBus.emit("logging:error", [
      `[ConfigHandler] Failed to get single template entry: ${templateName}`,
      err,
    ]);
    callback?.(null);
  }
}

export async function handleListProfiles({ callback }) {
  try {
    const profiles = await window.api.config.listUserProfiles();
    callback?.(profiles);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[ConfigHandler] Failed to list profiles:",
      err,
    ]);
    callback?.([]);
  }
}

export async function handleGetCurrentProfileFilename({ callback }) {
  try {
    const filename = await window.api.config.currentProfileFilename();
    callback?.(filename);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[ConfigHandler] Failed to get current profile filename:",
      err,
    ]);
    callback?.(null);
  }
}

export async function handleProfileSwitch({ filename, callback }) {
  try {
    await window.api.config.switchUserProfile(filename);
    EventBus.emit("logging:default", [
      `[ConfigHandler] Switched to profile: ${filename}`,
    ]);
    EventBus.emit("boot:reload");
    callback?.(true);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[ConfigHandler] Failed to switch profile:",
      err,
    ]);
    callback?.(false);
  }
}
