// modules/handlers/formHandlers.js

import { EventBus } from "../eventBus.js";

export async function handleFormSelected(datafile) {
  EventBus.emit("logging:default", [
    "[Handler] form:selected received:",
    datafile,
  ]);
  await window.api.config.updateUserConfig({ selected_data_file: datafile });
}
