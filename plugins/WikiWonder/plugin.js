// plugins/WikiWonder/plugin.js

async function performMarkdownExport({
  plugin,
  selectedTemplate,
  selectedDataFile,
  outputDir,
  bulkMode,
  stripFrontmatter = false,
}) {
  if (bulkMode) {
    const storageFiles = await plugin.getStorageFilesForTemplate(
      selectedTemplate
    );

    for (const file of storageFiles) {
      await plugin.saveMarkdownTo({
        selectedTemplate,
        selectedDataFile: file,
        outputDir,
        filename: null,
        stripFrontmatter,
      });
    }
  } else {
    await plugin.saveMarkdownTo({
      selectedTemplate,
      selectedDataFile,
      outputDir,
      filename: null,
      stripFrontmatter,
    });
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
      settings.stripFrontmatter ??= false;

      const templateName = path.stripYamlExtension(selectedTemplate);
      const outputDir = `plugins/${pluginName}/markdown/${templateName}`;

      const fields = [
        {
          key: "stripFrontmatter",
          type: "boolean",
          label: "Strip Frontmatter",
          wrapper: "modal-form-row",
          fieldRenderer: "renderBooleanField",
          value: settings.stripFrontmatter ?? false,
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
            plugin,
            selectedTemplate,
            selectedDataFile,
            outputDir,
            bulkMode: Boolean(values.bulkMode),
            stripFrontmatter: Boolean(values.stripFrontmatter),
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
