// utils/pluginUtils.js

import { EventBus } from "../modules/eventBus.js";
import { stripMetaExtension } from "./pathUtils.js";
import {
  renderMarkdown,
  parseFrontmatter,
  buildFrontmatter,
  filterFrontmatter,
} from "./transformationUtils.js";
import {
  getUserConfig as baseGetUserConfig,
  saveUserConfig,
} from "./configUtil.js";

// Plugin-specific allowed keys
const pluginAllowedKeys = [
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

// Wrapper for plugin usage
export async function getUserConfig(key) {
  return baseGetUserConfig(key, { allowedKeys: pluginAllowedKeys });
}

export { saveUserConfig };

export async function getStorageFilesForTemplate(templateFilename) {
  if (!templateFilename) return [];

  const entries = await new Promise((resolve) => {
    EventBus.emit("form:extendedList", {
      templateFilename,
      callback: resolve,
    });
  });

  return (entries || []).map((entry) => entry.filename);
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

export async function ensureDirectory(
  dirPath,
  label = null,
  silent = false,
  throwOnError = false
) {
  return EventBus.emitWithResponse("file:ensure-directory", {
    dirPath,
    label,
    silent,
    throwOnError,
  });
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

export async function emptyFolder(dirPath) {
  return EventBus.emitWithResponse("file:empty-folder", { dirPath });
}

export async function copyFolder({ from, to, overwrite = true }) {
  if (!from || !to) {
    console.warn("[pluginUtils] copyFolder requires 'from' and 'to' paths.");
    return { success: false, error: "Missing source or target path" };
  }

  try {
    const result = await EventBus.emitWithResponse("file:copy-folder", {
      from,
      to,
      overwrite,
    });
    return result;
  } catch (err) {
    console.warn("[pluginUtils] copyFolder failed:", err);
    return { success: false, error: err.message || "Copy failed" };
  }
}

export async function copyFile({ from, to, overwrite = true }) {
  if (!from || !to) {
    console.warn("[pluginUtils] copyFile requires 'from' and 'to' paths.");
    return { success: false, error: "Missing source or target path" };
  }

  try {
    const result = await EventBus.emitWithResponse("file:copy-file", {
      from,
      to,
      overwrite,
    });
    return result;
  } catch (err) {
    console.warn("[pluginUtils] copyFile failed:", err);
    return { success: false, error: err.message || "Copy failed" };
  }
}

export async function fileExists(path) {
  return EventBus.emitWithResponse("file:exists", { path });
}

export async function openExternal(url) {
  // This one does not need a response
  EventBus.emit("file:openExternal", { url });
}

export async function proxyFetch(url, options = {}) {
  const result = await EventBus.emitWithResponse("plugin:proxy-fetch", {
    url,
    options,
  });
  if (result?.success && result.content) {
    return result.content;
  } else {
    return {
      ok: false,
      error: result?.error || "Unknown proxy fetch error",
      status: 500,
    };
  }
}

// Execute system-level command (e.g., Powershell, shell script, etc.)
export async function executeSystemCommand(cmd) {
  if (!cmd || typeof cmd !== "string") {
    console.warn(
      "[pluginUtils] executeSystemCommand requires a valid command string."
    );
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
  stripFrontmatter = false,
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

  let markdown = await renderMarkdown(template, storage.data);
  if (!markdown) {
    console.warn("[saveMarkdownTo] Markdown rendering failed");
    return null;
  }

  // Frontmatter filtering logic
  if (Array.isArray(stripFrontmatter)) {
    const { frontmatter, body } = await parseFrontmatter(markdown);
    const filtered = await filterFrontmatter(frontmatter, stripFrontmatter);
    markdown = await buildFrontmatter(filtered, body);
  } else if (stripFrontmatter === true) {
    const { body } = await parseFrontmatter(markdown);
    markdown = body;
  }

  await ensureDirectory(outputDir, "MarkdownOutput", true);

  const baseName = filename || stripMetaExtension(selectedDataFile);
  const markdownFilePath = await resolvePath(outputDir, `${baseName}.md`);

  await saveFile(markdownFilePath, markdown, { silent: true });

  if (showToast) {
    EventBus.emit("ui:toast", {
      message: `Saved markdown to ${markdownFilePath}`,
      variant: "success",
    });
  }

  return markdownFilePath;
}
