// modules/handlers/bootHandlers.js

import { EventBus } from "../eventBus.js";

export async function initializeFromConfig(config) {
  const {
    selected_template,
    selected_data_file,
    context_mode,
    logging_enabled,
    theme,
  } = config;

  EventBus.emit("logging:default", [
    "[BootInit] Configuration received:",
    JSON.stringify(config, null, 2),
  ]);

  // ─── Apply visual & logging config first ───
  EventBus.emit("theme:toggle", theme);
  EventBus.emit("logging:toggle", logging_enabled);

  // ─── Toggle context view and await it ───
  const isStorage = context_mode === "storage";
  await EventBus.emit("context:toggle", isStorage);

  // ─── Wait for list to be loaded, then highlight (instead of click) ───
  EventBus.once("template-list:loaded", () => {
    if (selected_template) {
      EventBus.emit("logging:default", [
        `[BootInit] Highlighting template: ${selected_template}`,
      ]);
      EventBus.emit("template:list:highlighted", selected_template);
    } else {
      EventBus.emit("logging:warning", [
        "[BootInit] No selected_template found.",
      ]);
    }
  });

  if (isStorage) {
    EventBus.once("storage-list:loaded", () => {
      if (selected_data_file) {
        EventBus.emit("logging:default", [
          `[BootInit] Highlighting form: ${selected_data_file}`,
        ]);
        EventBus.emit("form:list:highlighted", selected_data_file);
      } else {
        EventBus.emit("logging:warning", [
          "[BootInit] No selected_data_file provided.",
        ]);
      }
    });
  }
}
