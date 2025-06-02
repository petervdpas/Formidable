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

  if (!formManager) {
    EventBus.emit("logging:warning", [
      "[Handler] No formManager injected for context:select:form.",
    ]);
    return;
  }

  const config = await window.api.config.loadUserConfig();
  const formChanged = config.selected_data_file !== datafile;

  if (formChanged) {
    await window.api.config.updateUserConfig({ selected_data_file: datafile });
  }

  if (!datafile) {
    formManager.clearForm();
    return;
  }

  await formManager.loadFormData(null, datafile);

  if (formChanged) {
    EventBus.emit("form:list:highlighted", datafile);
  }
}
