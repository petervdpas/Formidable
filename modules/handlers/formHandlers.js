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
    "[Handler] context:select:form received:",
    datafile,
  ]);

  if (datafile === window.currentSelectedFormName) {
    EventBus.emit("logging:default", [
      "[Handler] Skipping redundant form selection:",
      datafile,
    ]);
    return;
  }
  window.currentSelectedFormName = datafile;

  await window.api.config.updateUserConfig({ selected_data_file: datafile });

  if (!formManager) {
    EventBus.emit("logging:warning", [
      "[Handler] No formManager injected for context:select:form.",
    ]);
    return;
  }

  if (!datafile) {
    formManager.clearForm(); // you'd expose this
    return;
  }

  await formManager.loadFormData(null, datafile);
}
