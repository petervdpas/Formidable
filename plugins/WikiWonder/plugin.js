// plugins/WikiWonder/plugin.js

export async function run() {
  const { plugin, button, modal, dom } = window.FGA;
  const pluginName = "WikiWonder";

  const { show } = modal.setupPluginModal({
    id: "plugin-settings-wikiwonder",
    title: "WikiWonder",
    escToClose: true,
    backdropClick: true,
    width: "40em",
    height: "auto",
    resizable: false,

    prepareBody: async (modalEl, bodyEl) => {
      const [contextFolder, selectedTemplate, selectedDataFile] = await Promise.all([
        plugin.getConfig("context_folder"),
        plugin.getConfig("selected_template"),
        plugin.getConfig("selected_data_file"),
      ]);

      let settings = await plugin.getSettings(pluginName);
      if (!settings || typeof settings !== "object") settings = {};
      settings.targetFolder ??= "";

      // Render current form to markdown inside plugin folder
      const templateName = selectedTemplate.replace(/\.ya?ml$/i, "");
      const outputDir = `plugins/${pluginName}/markdown/${templateName}`;

      const markdownPath = await plugin.saveMarkdownTo({
        selectedTemplate,
        selectedDataFile,
        outputDir,
        filename: null, // auto
      });

      const fields = [
        {
          key: "targetFolder",
          type: "directory",
          label: "Target Folder",
          wrapper: "modal-form-row",
          fieldRenderer: "renderDirectoryField",
          value: settings.targetFolder,
        },
      ];

      const fieldManager = dom.createFieldManager({
        container: bodyEl,
        fields,
        data: { targetFolder: settings.targetFolder },
        injectBefore: () => {
          const info = document.createElement("p");
          info.textContent = `This plugin exports the current form as markdown into "${outputDir}". Press "Copy to Target" to copy all files to your selected folder.`;
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

          const result = await plugin.saveSettings(pluginName, settings);
          emit("ui:toast", {
            message: result?.success ? "Settings saved" : "Failed to save settings",
            variant: result?.success ? "success" : "error",
          });
        },
      });

      const copyBtn = button.createButton({
        text: "Copy to Target",
        className: "btn-info",
        onClick: async () => {
          const targetDir = fieldManager.getValues().targetFolder;
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
        },
      });

      bodyEl.appendChild(button.buildButtonGroup(saveBtn, copyBtn));
    },
  });

  show();
}