// plugins/PandocPrint/plugin.js

export async function run() {
  const { plugin, button, modal, dom, string } = window.FGA;
  const pluginName = "PandocPrint";

  setTimeout(async () => {
    const markdownRoot = `plugins/${pluginName}/markdown`;
    try {
      await plugin.emptyFolder(markdownRoot);
      emit("ui:toast", {
        message: `Cleared markdown folder: ${markdownRoot}`,
        variant: "success",
        duration: 3000,
      });
    } catch (err) {
      emit("ui:toast", {
        message: `Failed to clear markdown folder: ${err.message}`,
        variant: "error",
        duration: 5000,
      });
    }
  }, 100);

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

      let settings = await plugin.getSettings(pluginName);
      if (!settings || typeof settings !== "object") settings = {};
      settings.platform ??= "linux";
      settings.platforms ??= {};
      settings.overwrite ??= true;

      const platformOptions = [
        { value: "windows", label: "Windows" },
        { value: "mac", label: "Mac" },
        { value: "linux", label: "Linux" },
      ];

      const variableFields = [
        { key: "UseFormidable", type: "boolean", label: "Use Formidable" },
        { key: "ShellCommand", type: "text", label: "Shell Command" },
        { key: "InputPath", type: "file", label: "Input File" },
        { key: "OutputPath", type: "directory", label: "Output Directory" },
        { key: "TemplatePath", type: "file", label: "Latex Template" },
        { key: "UseCurrentDate", type: "boolean", label: "Use Current Date" },
        { key: "PowershellScript", type: "file", label: "Powershell Script" },
      ];

      const platformField = {
        key: "platform",
        type: "dropdown",
        label: "Platform",
        options: platformOptions,
        wrapper: "modal-form-row",
        fieldRenderer: "renderDropdownField",
        value: settings.platform,
      };

      const getInitialValues = (platform) => {
        const vars = settings.platforms?.[platform] || {};
        const values = {};
        for (const field of variableFields) {
          const raw = vars[field.key]?.value;
          values[field.key] =
            field.type === "boolean"
              ? raw === true || raw === "true"
              : raw || "";
        }
        return values;
      };

      const fields = [
        platformField,
        ...variableFields.map((f) => ({
          ...f,
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: `render${f.type.charAt(0).toUpperCase()}${f.type.slice(
            1
          )}Field`,
        })),
      ];

      const fieldManager = dom.createFieldManager({
        container: bodyEl,
        fields,
        data: {
          platform: settings.platform,
          ...getInitialValues(settings.platform),
        },
        injectBefore: () => {
          const info = document.createElement("p");
          info.textContent =
            "Convert Markdown to PDF using Pandoc. Configure settings per platform. Use placeholders like {InputPath}, {OutputPath}, etc. in your command.";
          info.className = "form-info-text";
          return info;
        },
      });

      await fieldManager.renderFields();

      // Update fields when switching platform
      const platformSelect = bodyEl.querySelector('[name="platform"]');
      platformSelect?.addEventListener("change", async () => {
        const selected = platformSelect.value;
        settings.platform = selected;
        await fieldManager.setValues({
          platform: selected,
          ...getInitialValues(selected),
        });
      });

      const saveBtn = button.createButton({
        text: "Save Settings",
        className: "btn-warn",
        onClick: async () => {
          const values = fieldManager.getValues();
          const platform = values.platform;

          settings.platform = platform;
          settings.platforms[platform] = settings.platforms[platform] || {};

          for (const field of variableFields) {
            const val =
              field.type === "boolean"
                ? Boolean(values[field.key])
                : values[field.key];
            settings.platforms[platform][field.key] = { value: val };
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

      const renderBtn = button.createButton({
        text: "Render Markdown",
        className: "btn-info",
        onClick: async () => {
          // Set InputPath from Formidable-generated Markdown if applicable
          if (fieldManager.getValue("UseFormidable")) {
            const markdownPath = await plugin.saveMarkdownTo({
              selectedTemplate,
              selectedDataFile,
              outputDir: `plugins/${pluginName}/markdown`,
              filename: null,
              showToast: true,
            });

            if (markdownPath) {
              fieldManager.setValue("InputPath", markdownPath);
            }
          }
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

          const finalCommand = string.combiMerge(
            [values.ShellCommand],
            cmdParams
          );

          console.log("[PandocPrint] Final command:", finalCommand);
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

      bodyEl.appendChild(
        button.buildButtonGroup(saveBtn, renderBtn, previewBtn)
      );
    },
  });

  show();
}
