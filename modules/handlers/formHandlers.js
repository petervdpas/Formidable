// modules/handlers/formHandlers.js

import { EventBus } from "../eventBus.js";
import { clearContainerUI } from "../../utils/formUtils.js";
import { t } from "../../utils/i18n.js";

let formManager = null;
let storageListManager = null;

let lastSelectedForm = null;
let lastSelectedTime = 0;
let isLoadingForm = false;

export function bindFormDependencies(deps) {
  formManager = deps.formManager;
  storageListManager = deps.storageListManager;
}

// SELECTED
export async function handleFormSelected(datafile) {
  const now = Date.now();

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

  // Always update config — even if duplicate
  if (formChanged) {
    EventBus.emit("config:update", { selected_data_file: datafile });
  }

  // If no datafile → just clear
  if (!datafile) {
    formManager.clearForm();
    return;
  }

  // Duplicate or already loading → skip UI reload but config already updated
  if (isLoadingForm) {
    EventBus.emit("logging:warning", [
      "[Handler] Already loading a form, ignoring reload for:",
      datafile,
    ]);
    return;
  }

  if (datafile === lastSelectedForm && now - lastSelectedTime < 2000) {
    EventBus.emit("logging:warning", [
      "[Handler] Duplicate form:selected ignored for reload:",
      datafile,
    ]);
    return;
  }

  // Track last selection
  lastSelectedForm = datafile;
  lastSelectedTime = now;
  isLoadingForm = true;

  try {
    await formManager.loadFormData(null, datafile);
  } finally {
    isLoadingForm = false;
  }
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

// EXTENDED LIST
export async function handleExtendedListForms({ templateFilename, callback }) {
  try {
    const result = await window.api.forms.extendedListForms(templateFilename);
    callback?.(result);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[formHandlers] Failed to extended list forms:",
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
export async function handleSaveForm(payload, respond) {
  const { templateFilename, datafile, payload: data, fields = [] } = payload;

  try {
    const result = await window.api.forms.saveForm(
      templateFilename,
      datafile,
      data,
      fields
    );

    const shortName =
      datafile || result.path?.split(/[/\\]/).pop() || "unknown.json";

    if (result.success) {
      EventBus.emit("status:update", `Saved data: ${shortName}`);

      EventBus.emit("ui:toast", {
        message: `${t("toast.save.success")}: ${shortName}`,
        variant: "success",
        duration: 4000,
      });

      EventBus.emit("form:list:reload");
      setTimeout(() => EventBus.emit("form:list:highlighted", datafile), 500);

      const templateName = (templateFilename || "").replace(/\.yaml$/, "");
      EventBus.emit("vfs:refreshTemplate", { templateName: templateName });
    } else {
      EventBus.emit("status:update", `Failed to save: ${result.error}`);

      EventBus.emit("ui:toast", {
        message: `${t("toast.save.failed")}: ${shortName}`,
        variant: "error",
        duration: 4000,
      });
    }

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
  { templateFilename, datafile, container = null },
  callback
) {
  try {
    const result = await window.api.forms.deleteForm(
      templateFilename,
      datafile
    );

    if (result) {
      EventBus.emit("status:update", `Deleted data: ${datafile}`);
      EventBus.emit("form:list:reload");

      if (container) {
        clearContainerUI(
          container,
          "special.forms.placeholder",
          "Select or create a form-file to begin."
        );
      }

      const templateName = (templateFilename || "").replace(/\.yaml$/, "");
      EventBus.emit("vfs:refreshTemplate", { templateName: templateName });
    } else {
      EventBus.emit("status:update", "Failed to delete data file.");
    }

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
