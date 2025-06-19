// modules/handlers/bootHandlers.js

import { EventBus } from "../eventBus.js";

export async function initializeFromConfig(config) {
  const {
    selected_template,
    selected_data_file,
    context_mode,
    logging_enabled,
    theme,
    enable_internal_server,
    internal_server_port,
  } = config;

  EventBus.emit("logging:default", [
    "[BootInit] Configuration received:",
    JSON.stringify(config, null, 2),
  ]);

  // ─── Stage 1: Init cache & VFS ───
  await EventBus.emit("cache:init", {
    dbName: "formidable-db",
    version: 1,
    stores: [{ name: "vfs", keyPath: "id" }],
  });

  await EventBus.emit("vfs:init");

  // ─── Stage 2: Visual & logging settings ───
  EventBus.emit("theme:toggle", theme);
  EventBus.emit("logging:toggle", logging_enabled);

  // ─── Stage 3: Start internal server if needed ───
  if (enable_internal_server) {
    EventBus.emit("server:start", { port: internal_server_port || 8383 });
  }

  // ─── Stage 4: Toggle context view ───
  const isStorage = context_mode === "storage";
  await EventBus.emit("context:toggle", isStorage);

  // ─── Stage 5: Handle template list highlighting ───
  EventBus.once("template-list:loaded", () => {
    if (selected_template) {
      EventBus.emit("logging:default", [
        `[BootInit] Highlighting template: ${selected_template}`,
      ]);
      EventBus.emit("template:list:itemClicked", selected_template);
    } else {
      EventBus.emit("logging:warning", [
        "[BootInit] No selected_template found.",
      ]);
    }
  });

  // ─── Stage 6: Handle form list highlighting ───
  if (isStorage) {
    EventBus.once("storage-list:loaded", () => {
      if (selected_data_file) {
        EventBus.emit("logging:default", [
          `[BootInit] Highlighting form: ${selected_data_file}`,
        ]);
        EventBus.emit("form:list:itemClicked", selected_data_file);
      } else {
        EventBus.emit("logging:warning", [
          "[BootInit] No selected_data_file provided.",
        ]);
      }
    });
  }
}
