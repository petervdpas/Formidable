// modules/handlers/formHandlers.js

import { EventBus } from "../eventBus.js";
import { clearContainerUI } from "../../utils/formUtils.js";

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
    EventBus.emit("form:context:update", null);
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
    if (data) {
      EventBus.emit("form:context:update", {
        meta: data.meta || null,
        data: data.data || {},
        template: templateFilename || null,
        filename: datafile || null,
      });
    } else {
      EventBus.emit("form:context:update", null);
    }
    callback?.(data);
  } catch (err) {
    EventBus.emit("logging:error", [
      "[formHandlers] Failed to load form:",
      err,
    ]);
    callback?.(null);
  }
}

// --- PRE-SAVE HOOK: run code fields with run_mode === 'save' -----------------
export async function handleBeforeSaveRun(
  { templateFilename, datafile, data, fields },
  respond
) {
  try {
    if (!Array.isArray(fields) || !fields.length || !data || typeof data !== "object") {
      respond?.(data);
      return;
    }

    const updated = { ...data }; // shallow copy; we only overwrite field keys

    // helpers (local copy; no assumptions beyond your renderer logic)
    const pick = (obj, ...keys) => {
      for (const k of keys) if (obj && obj[k] !== undefined) return obj[k];
      return undefined;
    };
    const optsToObject = (opts) => {
      if (!opts) return {};
      const out = {};
      if (Array.isArray(opts)) {
        for (const it of opts) {
          if (it && typeof it === "object") {
            if ("value" in it) {
              const k = String(it.value).trim();
              const v = "label" in it ? String(it.label) : "";
              out[k] = v;
              continue;
            }
            if ("key" in it) {
              out[String(it.key)] = String(it.value ?? "");
              continue;
            }
          }
          if (Array.isArray(it) && it.length >= 2) {
            out[String(it[0])] = String(it[1]);
            continue;
          }
          if (typeof it === "string" && it.includes("=")) {
            const [k, ...rest] = it.split("=");
            out[k].trim() = rest.join("=").trim();
          }
        }
        return out;
      }
      if (typeof opts === "object") return { ...opts };
      return {};
    };

    // Build a minimal, live snapshot (fresh data you're about to save)
    // Note: keep _meta out of .data if you prefer; it won’t break callers either way.
    const formSnap = {
      meta: updated?._meta || null,
      data: { ...updated },             // live data view
      template: templateFilename || null,
      filename: datafile || null,
    };

    // Run sequentially to avoid side-effects overlap
    for (const f of fields) {
      if (!f || f.type !== "code") continue;
      const runMode = String(f.run_mode || "").toLowerCase();
      if (runMode !== "save" || !f.allow_run) continue;

      const src = typeof f.default === "string" ? f.default : "";
      if (!src.trim()) continue;

      const inputMode  = pick(f, "input_mode", "inputMode") || "safe";
      const apiMode    = pick(f, "api_mode", "apiMode")   || "frozen";
      const apiPickRaw = pick(f, "api_pick", "apiPick");
      const apiPick = Array.isArray(apiPickRaw)
        ? apiPickRaw
        : typeof apiPickRaw === "string"
          ? apiPickRaw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
          : null;

      const opts = optsToObject(f.options);

      const payload = {
        code: String(src),
        input: { ...(pick(f, "input") ?? {}), form: formSnap }, // scripts can also read input.form
        timeout: Number(pick(f, "timeout")) || 3000,
        inputMode,
        apiPick,
        apiMode,
        opts,
        optsAsVars: Array.isArray(f.options) && f.options.length > 0,

        // NEW: override api.form.snapshot() for this run with the live snapshot
        formSnapshot: formSnap,
      };

      let res;
      try {
        res = await EventBus.emitWithResponse("code:execute", payload);
      } catch (e) {
        res = { ok: false, error: String(e), logs: [] };
      }

      if (res?.ok) {
        // Write the computed value back into the data payload
        updated[f.key] = res.result;

        // NEW: refresh the live snapshot so subsequent code fields see latest data
        formSnap.data = { ...updated };
      } else {
        EventBus.emit("logging:warning", [
          `[formHandlers] Code field "${f.key}" (run_mode:save) failed:`,
          res?.error || "Unknown error",
        ]);
      }
    }

    respond?.(updated);
  } catch (e) {
    EventBus.emit("logging:error", ["[formHandlers] handleBeforeSaveRun failed:", e]);
    respond?.(data); // fall back to original data
  }
}

// SAVE
export async function handleSaveForm(payload, respond) {
  const { templateFilename, datafile, payload: data, fields = [] } = payload;

  try {
    // let others preprocess (e.g., run code fields) before persisting
    const preprocessed = await EventBus.emitWithResponse(
      "form:save:run:before",
      { templateFilename, datafile, data, fields }
    );

    const dataToSave = preprocessed && typeof preprocessed === "object" ? preprocessed : data;

    const result = await window.api.forms.saveForm(
      templateFilename,
      datafile,
      dataToSave,
      fields
    );

    const shortName =
      datafile || result.path?.split(/[/\\]/).pop() || "unknown.json";

    if (result.success) {
      EventBus.emit("form:context:update", {
        meta: (data && data.meta) || null,
        data: (data && data.data) || {},
        template: templateFilename || null,
        filename: datafile || result.path?.split(/[/\\]/).pop() || null,
      });

      EventBus.emit("status:update", {
        message: "status.save.success",
        languageKey: "status.save.success",
        i18nEnabled: true,
        args: [shortName],
      });

      EventBus.emit("ui:toast", {
        languageKey: "toast.save.success",
        args: [shortName],
        variant: "success",
        duration: 4000,
      });

      EventBus.emit("form:list:reload");
      setTimeout(() => EventBus.emit("form:list:highlighted", datafile), 500);

      const templateName = (templateFilename || "").replace(/\.yaml$/, "");
      EventBus.emit("vfs:refreshTemplate", { templateName: templateName });
    } else {
      EventBus.emit("status:update", {
        message: "status.save.failed",
        languageKey: "status.save.failed",
        i18nEnabled: true,
        args: [shortName, result.error || "Unknown error"],
      });

      EventBus.emit("ui:toast", {
        languageKey: "toast.save.failed",
        args: [shortName],
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
      const snap = await EventBus.emitWithResponse("form:context:get");
      if (snap?.filename === datafile && snap?.template === templateFilename) {
        EventBus.emit("form:context:update", null);
      }

      EventBus.emit("status:update", {
        message: "status.delete.success",
        languageKey: "status.delete.success",
        i18nEnabled: true,
        args: [datafile],
      });

      EventBus.emit("form:list:reload");

      if (container) {
        clearContainerUI(
          container,
          "special.storage.placeholder",
          "Select or create a storage-file to begin."
        );
      }

      const templateName = (templateFilename || "").replace(/\.yaml$/, "");
      EventBus.emit("vfs:refreshTemplate", { templateName: templateName });
    } else {
      EventBus.emit("status:update", {
        message: "status.delete.failed",
        languageKey: "status.delete.failed",
        i18nEnabled: true,
        args: [datafile],
      });
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
