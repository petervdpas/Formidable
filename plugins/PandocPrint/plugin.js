// plugins/PandocPrint/plugin.js

export async function run() {
  const { path, plugin, button, modal, dom, string } = window.FGA;
  const pluginName = "PandocPrint";

  const { show } = modal.setupPluginModal({
    id: "plugin-settings-pandocprint",
    title: "Pandoc Print",
    escToClose: false,
    backdropClick: true,
    width: "40em",
    height: "auto",

    prepareBody: async (modalEl, bodyEl) => {
      
      const [contextFolder, selectedTemplate, selectedDataFile] =
        await Promise.all([
          plugin.getConfig("context_folder"),
          plugin.getConfig("selected_template"),
          plugin.getConfig("selected_data_file"),
        ]);

      console.log("[PandocPrint] Context:", {
        contextFolder,
        selectedTemplate,
        selectedDataFile,
      });

      let settings = await plugin.getSettings(pluginName);
      if (!settings || typeof settings !== "object") settings = {};
      settings.variables ??= {};
      settings.command ??=
        "pwsh {script} -InputPath {InputPath} -UseCurrentDate {UseCurrentDate} -TemplatePath {TemplatePath} -OutputPath {OutputPath}";
      settings.overwrite ??= true;

      const fields = [
        {
          key: "UseFormidable",
          type: "boolean",
          label: "Use Formidable",
          wrapper: "modal-form-row",
          fieldRenderer: "renderBooleanField",
          value: true,
        },
        {
          key: "InputPath",
          type: "file",
          label: "Input File",
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderFileField",
          value: "",
        },
        {
          key: "OutputPath",
          type: "directory",
          label: "Output Directory",
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderDirectoryField",
          value: "",
        },
        {
          key: "TemplatePath",
          type: "file",
          label: "Latex Template",
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderFileField",
          value: "",
        },
        {
          key: "UseCurrentDate",
          type: "boolean",
          label: "Use Current Date",
          wrapper: "modal-form-row",
          fieldRenderer: "renderBooleanField",
          value: true,
        },
        {
          key: "PowershellScript",
          type: "file",
          label: "Powershell Script",
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderFileField",
          value: "",
        },
      ];

      const initialData = Object.fromEntries(
        fields.map((f) => {
          const raw = settings.variables?.[f.key]?.value;
          const val =
            f.type === "boolean" ? raw === true || raw === "true" : raw;
          return [f.key, val];
        })
      );

      const fieldManager = dom.createFieldManager({
        container: bodyEl,
        fields,
        data: initialData,
      });

      await fieldManager.renderFields();

      const saveBtn = button.createButton({
        text: "Save Settings",
        className: "btn-warn",
        onClick: async () => {
          const values = fieldManager.getValues();

          for (const [key, val] of Object.entries(values)) {
            const field = fields.find((f) => f.key === key);
            const toSave = field?.type === "boolean" ? Boolean(val) : val;
            settings.variables[key] = { value: toSave };
          }

          settings.updated = new Date().toISOString();
          const result = await plugin.saveSettings(pluginName, settings);

          emit("ui:toast", {
            message: result?.success
              ? "Settings saved"
              : "Failed to save settings",
            variant: result?.success ? "success" : "error",
          });
        },
      });

      const previewBtn = button.createButton({
        text: "Generate Command",
        className: "btn-info",
        onClick: async () => {
          const values = fieldManager.getValues();

          const cmdParams = {
            script: values.PowershellScript,
            InputPath: values.InputPath,
            OutputPath: values.OutputPath,
            TemplatePath: values.TemplatePath,
            UseCurrentDate: values.UseCurrentDate ? "true" : "false",
          };

          const finalCommand = string.combiMerge([settings.command], cmdParams);
          const result = await plugin.executeSystemCommand(finalCommand);

          const toastMessage = result.success
            ? "Command executed successfully"
            : "Command execution failed";
          const toastVariant = result.success ? "success" : "error";

          emit("ui:toast", {
            message: toastMessage,
            variant: toastVariant,
            duration: 8000,
          });
        },
      });

      bodyEl.appendChild(button.buildButtonGroup(saveBtn, previewBtn));

      if (initialData.UseFormidable && selectedTemplate && selectedDataFile) {
        const { template, storage } = await plugin.getTemplateAndData(
          selectedTemplate,
          selectedDataFile
        );

        const markdown = await plugin.renderMarkdown(template, storage.data);

        if (markdown) {
          const pluginMarkdownDir = await plugin.resolvePath(
            "plugins",
            pluginName,
            "markdown"
          );

          await plugin.ensureDirectory(pluginMarkdownDir, "PandocPrint");

          const filenameWithoutExt = path.stripMetaExtension(selectedDataFile);
          const markdownFilePath = await plugin.resolvePath(
            pluginMarkdownDir,
            `${filenameWithoutExt}.md`
          );

          await plugin.saveFile(markdownFilePath, markdown, {
            encoding: "utf8",
          });

          emit("ui:toast", {
            message: `Saved markdown to plugins/${pluginName}/markdown/${filenameWithoutExt}.md`,
            variant: "success",
          });
        }
      }
    },
  });

  show();
}
