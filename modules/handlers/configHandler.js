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
