// plugins/PandocPrint/plugin.js

export async function run() {
  const { plugin, button, modal, dom, string } = window.FGA;
  const pluginName = "PandocPrint";

  const { show } = modal.setupPluginModal({
    id: "plugin-settings-pandocprint",
    title: "Pandoc Print",
    escToClose: true,
    backdropClick: true,
    width: "44em",
    height: "auto",
    resizable: false,

    prepareBody: async (modalEl, bodyEl) => {
      const [contextFolder, selectedTemplate, selectedDataFile] =
        await Promise.all([
          plugin.getConfig("context_folder"),
          plugin.getConfig("selected_template"),
          plugin.getConfig("selected_data_file"),
        ]);

      /*
      console.log("[PandocPrint] Context:", {
        contextFolder,
        selectedTemplate,
        selectedDataFile,
      });
      */

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
        injectBefore: () => {
          const info = document.createElement("p");
          info.textContent =
            "This plugin allows you to convert Formidable entries—or any valid Markdown file with proper frontmatter—into a styled PDF using Pandoc and LaTeX. In 'Formidable mode', it auto-generates Markdown from your selected form entry. When disabled, you can manually provide any input file. This makes it powerful for both regular use and expert workflows. Make sure Pandoc and LaTeX (e.g. MikTeX) are installed, and check the plugin’s Tools folder for the required scripts.";
          info.className = "form-info-text";
          return info;
        },
      });

      await fieldManager.renderFields();

      if (initialData.UseFormidable) {
        const markdownPath = await plugin.saveMarkdownTo({
          selectedTemplate,
          selectedDataFile,
          outputDir: `plugins/${pluginName}/markdown`,
          filename: null,
        });

        if (markdownPath) {
          fieldManager.setValue("InputPath", markdownPath);
        }
      }

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
        text: "Generate PDF",
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
            ? "PDF generation executed successfully"
            : "PDF generation failed";
          const toastVariant = result.success ? "success" : "error";

          emit("ui:toast", {
            message: toastMessage,
            variant: toastVariant,
            duration: 8000,
          });
        },
      });

      bodyEl.appendChild(button.buildButtonGroup(saveBtn, previewBtn));
    },
  });

  show();
}
