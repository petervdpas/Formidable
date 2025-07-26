// plugins/WikiWonder/plugin.js

async function performMarkdownExport({
  path,
  plugin,
  selectedTemplate,
  selectedDataFile,
  outputDir,
  bulkMode,
  frontmatterMode = "keep",
  frontmatterKeys = "",
}) {
  const keysArray = frontmatterKeys
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const contextFolder = await plugin.getConfig("context_folder");
  const templateName = path.stripYamlExtension(selectedTemplate);
  const imageSrcDir = `${contextFolder}/storage/${templateName}/images`;
  const imageDestDir = `${outputDir}/.images`;

  const baseOpts = {
    selectedTemplate,
    outputDir,
    filename: null,
  };

  const imageSet = new Set();

  async function renderOneFile(dataFile) {
    const opts = {
      ...baseOpts,
      selectedDataFile: dataFile,
      stripFrontmatter:
        frontmatterMode === "remove"
          ? true
          : frontmatterMode === "filter"
          ? keysArray
          : false,
    };

    const markdownPath = await plugin.saveMarkdownTo(opts);
    const content = await plugin.loadFile(markdownPath);
    const markdown = typeof content === "string" ? content : content?.data;
    if (!markdown) return;

    let updated = markdown;
    const matches = [...markdown.matchAll(/!\[.*?\]\((.*?)\)/g)];

    for (const match of matches) {
      const rawPath = match[1]?.trim();
      if (!rawPath) continue;

      // Accept absolute Windows path or relative
      
      const filename = rawPath.split(/[\\/]/).pop();
      const newPath = `.images/${filename}`;

      imageSet.add(filename);
      updated = updated.replaceAll(`](${rawPath})`, `](${newPath})`);
    }

    if (updated !== markdown) {
      await plugin.saveFile(markdownPath, updated);
    }
  }

  if (bulkMode) {
    const files = await plugin.getStorageFilesForTemplate(selectedTemplate);
    for (const file of files) {
      await renderOneFile(file);
    }
  } else {
    await renderOneFile(selectedDataFile);
  }

  // Copy images
  if (imageSet.size > 0) {
    await plugin.ensureDirectory(imageDestDir);
    for (const filename of imageSet) {
      const from = `${imageSrcDir}/${filename}`;
      const to = `${imageDestDir}/${filename}`;
      try {
        await plugin.copyFile({ from, to, overwrite: true });
      } catch (err) {
        console.warn(`[WikiWonder] Failed to copy ${filename}: ${err.message}`);
      }
    }
  }

  emit("ui:toast", {
    message: "Markdown export complete.",
    variant: "success",
    duration: 6000,
  });
}

async function copyToTarget({ plugin, pluginName, targetDir }) {
  if (!targetDir) {
    emit("ui:toast", {
      message: "Please select a target folder first",
      variant: "error",
    });
    return;
  }

  const sourceDir = `plugins/${pluginName}/markdown`;
  const result = await plugin.copyFolder({
    from: sourceDir,
    to: targetDir,
    overwrite: true,
  });

  emit("ui:toast", {
    message: result.success
      ? "Markdown copied to target folder"
      : "Failed to copy files",
    variant: result.success ? "success" : "error",
    duration: 7000,
  });
}

export async function run() {
  const { path, plugin, button, modal, dom } = window.FGA;
  const pluginName = "WikiWonder";

  const { show } = modal.setupPluginModal({
    id: "plugin-settings-wikiwonder",
    title: "WikiWonder",
    escToClose: true,
    backdropClick: true,
    width: "32em",
    height: "auto",
    resizable: false,

    prepareBody: async (modalEl, bodyEl) => {
      const [contextFolder, selectedTemplate, selectedDataFile] =
        await Promise.all([
          plugin.getConfig("context_folder"),
          plugin.getConfig("selected_template"),
          plugin.getConfig("selected_data_file"),
        ]);

      let settings = await plugin.getSettings(pluginName);
      if (!settings || typeof settings !== "object") settings = {};
      settings.targetFolder ??= "";
      settings.bulkMode ??= false;
      settings.frontmatterMode ??= "keep";
      settings.frontmatterKeys ??= "";

      const templateName = path.stripYamlExtension(selectedTemplate);
      const outputDir = `plugins/${pluginName}/markdown/${templateName}`;

      const fields = [
        {
          key: "frontmatterMode",
          type: "dropdown",
          label: "Frontmatter Mode",
          options: [
            { value: "keep", label: "Keep All" },
            { value: "remove", label: "Remove All" },
            { value: "filter", label: "Filter by Key" },
          ],
          wrapper: "modal-form-row",
          fieldRenderer: "renderDropdownField",
          value: settings.frontmatterMode,
        },
        {
          key: "frontmatterKeys",
          type: "text",
          label: "Keys to Keep (CSV)",
          wrapper: "modal-form-row",
          fieldRenderer: "renderTextField",
          value: settings.frontmatterKeys,
          visible: settings.frontmatterMode === "filter",
        },
        {
          key: "targetFolder",
          type: "directory",
          label: "Target Folder",
          wrapper: "modal-form-row",
          fieldRenderer: "renderDirectoryField",
          value: settings.targetFolder,
        },
        {
          key: "bulkMode",
          type: "boolean",
          label: "Bulk Mode",
          wrapper: "modal-form-row",
          fieldRenderer: "renderBooleanField",
          value: settings.bulkMode,
        },
      ];

      const fieldManager = dom.createFieldManager({
        container: bodyEl,
        fields,
        data: {
          bulkMode: settings.bulkMode,
          targetFolder: settings.targetFolder,
          frontmatterMode: settings.frontmatterMode,
          frontmatterKeys: settings.frontmatterKeys,
        },
        injectBefore: () => {
          const info = document.createElement("p");
          info.textContent = `This plugin exports the current form as markdown into "plugins/${pluginName}/markdown/<template>".\n\nIf Bulk Mode is enabled, all .meta.json files for the selected template will be rendered. Otherwise, only the currently selected file will be exported.`;
          info.className = "form-info-text";
          return info;
        },
      });

      await fieldManager.renderFields();

      const saveBtn = button.createButton({
        text: "Save Settings",
        className: "btn-warn",
        onClick: async () => {
          const values = fieldManager.getValues();
          settings.targetFolder = values.targetFolder;
          settings.bulkMode = Boolean(values.bulkMode);
          settings.frontmatterMode = values.frontmatterMode;
          settings.frontmatterKeys = values.frontmatterKeys;

          const result = await plugin.saveSettings(pluginName, settings);
          emit("ui:toast", {
            message: result?.success
              ? "Settings saved"
              : "Failed to save settings",
            variant: result?.success ? "success" : "error",
          });
        },
      });

      const renderBtn = button.createButton({
        text: "Render Markdown",
        className: "btn-info",
        onClick: async () => {
          const values = fieldManager.getValues();
          await performMarkdownExport({
            path,
            plugin,
            selectedTemplate,
            selectedDataFile,
            outputDir,
            bulkMode: Boolean(values.bulkMode),
            frontmatterMode: values.frontmatterMode,
            frontmatterKeys: values.frontmatterKeys,
          });
        },
      });

      const copyBtn = button.createButton({
        text: "Copy to Target",
        className: "btn-okay",
        onClick: async () => {
          const targetDir = fieldManager.getValues().targetFolder;
          await copyToTarget({ plugin, pluginName, targetDir });
        },
      });

      bodyEl.appendChild(button.buildButtonGroup(saveBtn, renderBtn, copyBtn));
    },
  });

  show();
}
