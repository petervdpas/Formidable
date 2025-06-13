// modules/handlers/formHandlers.js

import { EventBus } from "../eventBus.js";

let formManager = null;
let metaListManager = null;

export function bindFormDependencies(deps) {
  formManager = deps.formManager;
  metaListManager = deps.metaListManager;
}

export async function handleFormSelected(datafile) {
  EventBus.emit("logging:default", [
    "[Handler] form:selected received:",
    datafile,
  ]);

  if (!formManager) {
    EventBus.emit("logging:warning", [
      "[Handler] No formManager injected for form:selected.",
    ]);
    return;
  }

  const config = await new Promise((resolve) => {
    EventBus.emit("config:load", (cfg) => resolve(cfg));
  });
  const formChanged = config.selected_data_file !== datafile;

  if (formChanged) {
    EventBus.emit("config:update", { selected_data_file: datafile });
  }

  if (!datafile) {
    formManager.clearForm();
    return;
  }

  await formManager.loadFormData(null, datafile);
}
