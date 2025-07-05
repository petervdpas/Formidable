// plugins/PandocPrint/plugin.js

export async function run() {
  const { plugin, button, modal, dom } = window.FGA;
  const pluginName = "PandocPrint";

  const { show } = modal.setupPluginModal({
    id: "plugin-settings-pandocprint",
    title: "Pandoc Print",
    escToClose: false,
    backdropClick: true,
    width: "40em",
    height: "auto",

    prepareBody: async (modalEl, bodyEl) => {
      // ─── Laad settings ─────────────────────────────────────────────
      let settings = await plugin.getSettings(pluginName);
      if (!settings || typeof settings !== "object") settings = {};
      settings.variables ??= {};
      settings.command ??=
        "pwsh {script} -InputPath {InputPath} -UseCurrentDate {UseCurrentDate} -TemplatePath {TemplatePath} -OutputPath {OutputPath}";
      settings.overwrite ??= true;

      // ─── Definieer velden ──────────────────────────────────────────
      const fields = [
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

      // ─── Vul initiële waarden ─────────────────────────────────────
      const initialData = Object.fromEntries(
        fields.map(f => {
          const raw = settings.variables?.[f.key]?.value;
          const val = f.type === "boolean" ? raw === true || raw === "true" : raw;
          return [f.key, val];
        })
      );

      // ─── Maak field manager ────────────────────────────────────────
      const fieldManager = dom.createFieldManager({
        container: bodyEl,
        fields,
        data: initialData,
      });

      await fieldManager.renderFields();

      // ─── Save Settings knop ────────────────────────────────────────
      const saveBtn = button.createButton({
        text: "Save Settings",
        className: "btn-primary",
        onClick: async () => {
          const values = fieldManager.getValues();
          for (const [key, val] of Object.entries(values)) {
            const field = fields.find(f => f.key === key);
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

      bodyEl.appendChild(saveBtn);
    },
  });

  show();
}
