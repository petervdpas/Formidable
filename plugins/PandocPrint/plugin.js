// plugins/PandocPrint/plugin.js

export async function run() {
  const { plugin, button, modal, dom, fieldRenderers } = window.FGA;

  const pluginName = "PandocPrint";

  const { show } = modal.setupPluginModal({
    id: "plugin-settings-pandocprint",
    title: "Pandoc Print",
    escToClose: false,
    backdropClick: true,
    width: "40em",
    height: "auto",
    body: "",

    prepareBody: async (modalEl, bodyEl) => {
      let settings = await plugin.getSettings(pluginName);
      if (!settings || typeof settings !== "object") settings = {};
      if (!settings.variables) settings.variables = {};
      if (!settings.command) {
        settings.command =
          "pwsh {script} -InputPath {InputPath} -UseCurrentDate {UseCurrentDate} -TemplatePath {TemplatePath} -OutputPath {OutputPath}";
      }
      if (!("overwrite" in settings)) settings.overwrite = true;

      const defaults = {
        InputPath: {
          type: "file",
          value: "",
          label: "Input File",
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderFileField",
        },
        OutputPath: {
          type: "directory",
          value: "",
          label: "Output Directory",
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderDirectoryField",
        },
        TemplatePath: {
          type: "file",
          value: "",
          label: "Latex Template",
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderFileField",
        },
        UseCurrentDate: {
          type: "boolean",
          value: true,
          label: "Use Current Date",
          wrapper: "modal-form-row",
          fieldRenderer: "renderBooleanField",
        },
        PowershellScript: {
          type: "file",
          value: "",
          label: "Powershell Script",
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderFileField",
        },
      };

      for (const [key, def] of Object.entries(defaults)) {
        const stored = settings.variables[key];
        if (!stored || typeof stored !== "object") {
          settings.variables[key] = { value: def.value };
        } else {
          const val =
            def.type === "boolean"
              ? stored.value === "true" || stored.value === true
              : stored.value ?? def.value;
          settings.variables[key] = { value: val };
        }
      }

      const fields = Object.entries(defaults).map(([key, def]) => ({
        key,
        type: def.type,
        label: def.label,
        placeholder: def.placeholder || `Enter value for ${key}`,
        fieldRenderer: def.fieldRenderer,
        wrapper: def.wrapper || "modal-form-row",
      }));

      const values = Object.fromEntries(
        Object.entries(defaults).map(([key, def]) => {
          const stored = settings.variables[key] || {};
          const raw = stored.value ?? def.value;
          const val = def.type === "boolean" ? Boolean(raw) : raw;
          return [key, val];
        })
      );

      const fieldManager = dom.createFieldManager({
        container: bodyEl,
        fields,
        data: values,
        renderField: async (field, value) => {
          let fn = null;

          if (
            field.fieldRenderer &&
            typeof fieldRenderers[field.fieldRenderer] === "function"
          ) {
            fn = fieldRenderers[field.fieldRenderer];
          } else {
            const fallback = `render${field.type
              ?.charAt(0)
              .toUpperCase()}${field.type?.slice(1)}Field`;
            fn = fieldRenderers[fallback] || fieldRenderers.renderTextField;
          }

          field.onSave = async (f, val) => {
            const toSave = f.type === "boolean" ? Boolean(val) : val;
            settings.variables[f.key] = { value: toSave };
            settings.updated = new Date().toISOString();
            const result = await plugin.saveSettings(pluginName, settings);
            emit("ui:toast", {
              message: result?.success
                ? `${f.key} saved`
                : `Failed to save ${f.key}`,
              variant: result?.success ? "success" : "error",
            });
          };

          return await fn(field, value);
        },
        onSave: async (field, val) => {
          const toSave = field.type === "boolean" ? Boolean(val) : val;
          settings.variables[field.key] = { value: toSave };
          settings.updated = new Date().toISOString();
          const result = await plugin.saveSettings(pluginName, settings);
          emit("ui:toast", {
            message: result?.success
              ? `${field.key} saved`
              : `Failed to save ${field.key}`,
            variant: result?.success ? "success" : "error",
          });
        },
      });

      await fieldManager.renderFields();

      const showBtn = button.createButton({
        text: "Show Command",
        className: "btn-secondary",
        onClick: () => {
          const resolved = settings.command.replace(/\{(\w+)\}/g, (_, key) => {
            return settings.variables?.[key]?.value ?? `{${key}}`;
          });
          emit("ui:toast", {
            message: `Resolved: ${resolved}`,
            variant: "info",
          });
        },
      });

      bodyEl.appendChild(showBtn);
    },
  });

  show();
}
