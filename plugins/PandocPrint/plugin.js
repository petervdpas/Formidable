// plugins/PandocPrint/plugin.js

async function getMarkdownPath(plugin, pluginName, t) {
  await plugin.invalidateConfig();

  const tmpl = await plugin.getConfig("selected_template");
  const dfile = await plugin.getConfig("selected_data_file");

  if (!tmpl || tmpl === "") {
    Toast.error(t("plugin.toast.missing.selected.template"));
    return;
  }
  if (!dfile || dfile === "") {
    Toast.error(t("plugin.toast.missing.selected.storage"));
    return;
  }

  const opts = {
    selectedTemplate: tmpl,
    selectedDataFile: dfile,
    outputDir: `plugins/${pluginName}/markdown`,
    filename: null,
    stripFrontmatter: false,
    showToast: true,
  };

  return await plugin.saveMarkdownTo(opts);
}

export async function run() {
  const { plugin, button, modal, dom, string } = window.FGA;
  const pluginName = "PandocPrint";

  const lang = await plugin.getConfig("language");
  await plugin.loadPluginTranslations(pluginName, lang);
  const t = plugin.getPluginTranslations(pluginName);

  setTimeout(async () => {
    const markdownRoot = `plugins/${pluginName}/markdown`;
    try {
      await plugin.emptyFolder(markdownRoot);
      Toast.success(t("plugin.toast.folder.cleared", [markdownRoot]), null, {
        duration: 3000,
      });
    } catch (err) {
      Toast.error(t("plugin.toast.folder.failed", [err.message]), null, {
        duration: 5000,
      });
    }
  }, 100);

  const { show } = modal.setupPluginModal({
    pluginName,
    id: "plugin-settings-pandocprint",
    title: t("plugin.title"),
    escToClose: true,
    backdropClick: true,
    width: "44em",
    height: "auto",
    resizable: false,

    prepareBody: async (modalEl, bodyEl) => {
      let settings = await plugin.getSettings(pluginName);
      if (!settings || typeof settings !== "object") settings = {};
      settings.platform ??= "linux";
      settings.platforms ??= {};
      settings.overwrite ??= true;

      const platformOptions = [
        { value: "windows", label: t("plugin.platform.windows") },
        { value: "mac", label: t("plugin.platform.mac") },
        { value: "linux", label: t("plugin.platform.linux") },
      ];

      const variableFields = [
        {
          key: "UseFormidable",
          type: "boolean",
          label: t("plugin.field.useFormidable"),
          wrapper: "modal-form-row switch-row",
          fieldRenderer: "renderBooleanField",
          onFlip: async (isChecked) => {
            if (!isChecked) return;
            const path = await getMarkdownPath(plugin, pluginName, t);
            if (path) {
              fieldManager.setValue("InputPath", path);
            }
          },
        },
        {
          key: "ShellCommand",
          type: "text",
          label: t("plugin.field.shellCommand"),
          wrapper: "modal-form-row",
          fieldRenderer: "renderTextField",
        },
        {
          key: "InputPath",
          type: "file",
          label: t("plugin.field.inputPath"),
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderFileField",
        },
        {
          key: "OutputPath",
          type: "directory",
          label: t("plugin.field.outputPath"),
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderDirectoryField",
        },
        {
          key: "TemplatePath",
          type: "file",
          label: t("plugin.field.templatePath"),
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderFileField",
        },
        {
          key: "UseCurrentDate",
          type: "boolean",
          label: t("plugin.field.useCurrentDate"),
          wrapper: "modal-form-row switch-row",
          fieldRenderer: "renderBooleanField",
        },
        {
          key: "PowershellScript",
          type: "file",
          label: t("plugin.field.powershellScript"),
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderFileField",
        },
      ];

      const platformField = {
        key: "platform",
        type: "dropdown",
        label: t("plugin.field.platform"),
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
        ...variableFields.map(({ type, wrapper, fieldRenderer, ...rest }) => ({
          ...rest,
          type,
          wrapper,
          fieldRenderer,
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
          info.textContent = t("plugin.info.hint");
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
        text: t("plugin.button.save.settings"),
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

          Toast[result?.success ? "success" : "error"](
            t(
              result?.success
                ? "plugin.toast.settings.saved"
                : "plugin.toast.settings.failed"
            )
          );
        },
      });

      const renderBtn = button.createButton({
        text: t("plugin.button.render.markdown"),
        className: "btn-info",
        onClick: async () => {
          const markdownPath = await getMarkdownPath(plugin, pluginName, t);
          if (fieldManager.getValue("UseFormidable") && markdownPath) {
            fieldManager.setValue("InputPath", markdownPath);
          }
        },
      });

      const previewBtn = button.createButton({
        text: t("plugin.button.generate.pdf"),
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

          Toast[result.success ? "success" : "error"](
            t(
              result.success
                ? "plugin.toast.pdf.success"
                : "plugin.toast.pdf.failed"
            ),
            null,
            { duration: 8000 }
          );
        },
      });

      bodyEl.appendChild(
        button.buildButtonGroup(saveBtn, renderBtn, previewBtn)
      );
    },
  });

  show();
}
