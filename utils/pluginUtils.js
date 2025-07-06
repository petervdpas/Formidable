// utils/pluginUtils.js

import { EventBus } from "../modules/eventBus.js";
import { stripMetaExtension } from "./pathUtils.js";

const allowedConfigKeys = [
  "theme",
  "show_icon_buttons",
  "font_size",
  "logging_enabled",
  "context_mode",
  "context_folder",
  "selected_template",
  "selected_data_file",
  "author_name",
  "author_email",
  "use_git",
  "git_root",
  "enable_internal_server",
  "internal_server_port",
  "window_bounds",
];

// User Config Management
export async function getUserConfig(key) {
  return new Promise((resolve) => {
    EventBus.emit("config:load", (config) => {
      if (!config || typeof config !== "object") return resolve(undefined);
      if (typeof key === "string") {
        if (!allowedConfigKeys.includes(key)) {
          console.warn(`[getUserConfig] Disallowed key: "${key}"`);
          return resolve(undefined);
        }
        return resolve(config[key]);
      }
      resolve(config);
    });
  });
}

export async function saveUserConfig(partial) {
  EventBus.emit("config:update", partial);
}

/**
 * Load both the full template YAML and associated storage (.meta.json) data.
 * Both parameters are required.
 */
export async function getTemplateAndData(templateName, dataFilename) {
  if (!templateName || !dataFilename) {
    console.warn(
      "[pluginUtils] getTemplateAndData requires both templateName and dataFilename"
    );
    return { template: null, storage: null };
  }

  try {
    const template = await EventBus.emitWithResponse("template:load", {
      name: templateName,
    });

    const storage = await EventBus.emitWithResponse("form:load", {
      templateFilename: template.filename,
      datafile: dataFilename,
      fields: template.fields || [],
    });

    return { template, storage };
  } catch (err) {
    console.warn("[pluginUtils] Failed to load template or data:", err);
    return { template: null, storage: null };
  }
}

/**
 * Render markdown output from a given data + template combo.
 * Requires both arguments to be valid objects.
 */
export async function renderMarkdown(template, data) {
  if (!template || !data) {
    console.warn(
      "[pluginUtils] renderMarkdownFromTemplateData requires both template and data objects."
    );
    return null;
  }

  try {
    const markdown = await EventBus.emitWithResponse("transform:markdown", {
      template,
      data,
      filePrefix: false,
    });
    return markdown;
  } catch (err) {
    console.warn("[pluginUtils] Failed to render markdown:", err);
    return null;
  }
}

// Plugin Settings
export async function getPluginSettings(name) {
  return EventBus.emitWithResponse("plugin:get-settings", { name });
}

export async function savePluginSettings(name, settings) {
  return EventBus.emitWithResponse("plugin:save-settings", { name, settings });
}

// File I/O utilities
export async function resolvePath(...segments) {
  return EventBus.emitWithResponse("file:resolve", { segments });
}

export async function ensureDirectory(dirPath, label = null) {
  return EventBus.emitWithResponse("file:ensure-directory", { dirPath, label });
}

export async function saveFile(filepath, data, opts = {}) {
  return EventBus.emitWithResponse("file:save", { filepath, data, opts });
}

export async function loadFile(filepath, opts = {}) {
  return EventBus.emitWithResponse("file:load", { filepath, opts });
}

export async function deleteFile(filepath, opts = {}) {
  return EventBus.emitWithResponse("file:delete", { filepath, opts });
}

export async function fileExists(path) {
  return EventBus.emitWithResponse("file:exists", { path });
}

export async function openExternal(url) {
  // This one does not need a response
  EventBus.emit("file:openExternal", { url });
}

export async function proxyFetch(url) {
  return EventBus.emitWithResponse("plugin:proxy-fetch", { url });
}

// Execute system-level command (e.g., Powershell, shell script, etc.)
export async function executeSystemCommand(cmd) {
  if (!cmd || typeof cmd !== "string") {
    console.warn("[pluginUtils] executeSystemCommand requires a valid command string.");
    return { success: false, error: "Invalid command" };
  }

  try {
    const result = await EventBus.emitWithResponse("system:execute", { cmd });
    return result;
  } catch (err) {
    console.warn("[pluginUtils] System command failed:", err);
    return { success: false, error: err.message || "Command failed" };
  }
}

export async function saveMarkdownTo({
  selectedTemplate,
  selectedDataFile,
  outputDir,
  filename,
  showToast = false,
}) {
  if (!selectedTemplate || !selectedDataFile || !outputDir) {
    console.warn("[saveMarkdownTo] Missing required input(s)");
    return null;
  }

  const { template, storage } = await getTemplateAndData(
    selectedTemplate,
    selectedDataFile
  );

  if (!template || !storage) {
    console.warn("[saveMarkdownTo] Could not load template or data");
    return null;
  }

  const markdown = await renderMarkdown(template, storage.data);
  if (!markdown) {
    console.warn("[saveMarkdownTo] Markdown rendering failed");
    return null;
  }

  await ensureDirectory(outputDir, "MarkdownOutput");

  const baseName = filename || stripMetaExtension(selectedDataFile);
  const markdownFilePath = await resolvePath(outputDir, `${baseName}.md`);

  await saveFile(markdownFilePath, markdown, { encoding: "utf8" });

  if (showToast) {
    EventBus.emit("ui:toast", {
      message: `Saved markdown to ${markdownFilePath}`,
      variant: "success",
    });
  }

  return markdownFilePath;
}