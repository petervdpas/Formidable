// modules/handlers/bootHandlers.js

import { EventBus } from "../eventBus.js";

async function insertTestData(storeName) {
  const testItems = [
    { id: "1", naam: "Test item 1", waarde: 100 },
    { id: "2", naam: "Test item 2", waarde: 200 },
  ];

  for (const item of testItems) {
    await new Promise((resolve) => {
      EventBus.emit("cache:put", { storeName, item });
      setTimeout(resolve, 50);
    });
  }
}

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

  // Initialiseer de cache met stores
  await EventBus.emit("cache:init", {
    dbName: "formidable-db",
    version: 1,
    stores: [
      { name: "testStore", keyPath: "id" },
      // ... voeg hier je andere stores toe
    ],
  });

  // ─── Voeg testdata toe in IndexedDB in store "testStore" ───
  await insertTestData("testStore");

  // ─── Wait for list to be loaded, then highlight (instead of click) ───
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
