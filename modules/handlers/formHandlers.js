// modules/handlers/formHandlers.js

import { EventBus } from "../eventBus.js";

let formManager = null;
let metaListManager = null;

export function bindFormDependencies(deps) {
  formManager = deps.formManager;
  metaListManager = deps.metaListManager;
}

// SELECTED
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

// LIST
export async function handleListForms({ templateFilename, callback }) {
  try {
    const files = await window.api.forms.listForms(templateFilename);
    callback?.(files);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[formHandlers] Failed to list forms:",
      err,
    ]);
    callback?.([]);
  }
}

// LOAD
export async function handleLoadForm(
  { templateFilename, datafile, fields = [] },
  callback
) {
  try {
    const data = await window.api.forms.loadForm(
      templateFilename,
      datafile,
      fields
    );
    callback?.(data);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[formHandlers] Failed to load form:",
      err,
    ]);
    callback?.(null);
  }
}

// SAVE
export function handleSaveForm(payload, respond) {
  const { templateFilename, datafile, payload: data, fields = [] } = payload;

  try {
    const result = window.api.forms.saveForm(
      templateFilename,
      datafile,
      data,
      fields
    );
    respond?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[formHandlers] Failed to save form:",
      err,
    ]);
    respond?.({ success: false, error: err.message });
  }
}

// DELETE
export async function handleDeleteForm(
  { templateFilename, datafile },
  callback
) {
  try {
    const result = await window.api.forms.deleteForm(
      templateFilename,
      datafile
    );
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[formHandlers] Failed to delete form:",
      err,
    ]);
    callback?.(false);
  }
}

// ENSURE FORM DIR
export async function handleEnsureFormDir(templateFilename, callback) {
  try {
    const dir = await window.api.forms.ensureFormDir(templateFilename);
    callback?.(dir);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[formHandlers] Failed to ensure form directory:",
      err,
    ]);
    callback?.(null);
  }
}

// SAVE IMAGE FILE
export async function handleSaveImageFile(
  { virtualLocation, filename, buffer },
  callback
) {
  try {
    const result = await window.api.forms.saveImageFile(
      virtualLocation,
      filename,
      buffer
    );
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[formHandlers] Failed to save image file:",
      err,
    ]);
    callback?.(null);
  }
}
