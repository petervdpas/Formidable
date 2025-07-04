// plugins/Crazy/plugin.js

export async function run() {
  const { plugin, button, modal, builders } = window.FGA;
  const { getSettings, saveSettings } = plugin;
  const { createButton } = button;
  const { setupPluginModal } = modal;
  const { createFormRowInput } = builders;

  const pluginName = "Crazy";

  const { show } = setupPluginModal({
    id: "plugin-settings-test-modal",
    title: "Plugin Settings Test",
    body: "",

    prepareBody: async (modalEl, bodyEl) => {
      // Load current plugin settings
      const currentSettings = await getSettings(pluginName);
      const greetingValue = currentSettings?.greeting ?? "";

      // Add input for editable greeting
      let newSettings = { ...currentSettings };

      const greetingRow = createFormRowInput({
        id: "crazy-greeting",
        label: "Greeting",
        value: greetingValue,
        placeholder: "Enter a greeting message",
        onSave: async (val) => {
          newSettings.greeting = val;
          newSettings.updated = new Date().toISOString();

          const result = await saveSettings(pluginName, newSettings);
          emit("ui:toast", {
            message: result?.success
              ? "Greeting saved!"
              : "Failed to save greeting.",
            variant: result?.success ? "success" : "error",
          });
        },
      });

      bodyEl.appendChild(greetingRow);

      // Confirm settings loaded
      const btn = createButton({
        text: "Toast!",
        className: "btn-secondary",
        onClick: () =>
          emit("ui:toast", {
            message: `Current greeting: ${newSettings.greeting || "(none)"}`,
            variant: "info",
          }),
        ariaLabel: "Show greeting",
      });

      bodyEl.appendChild(btn);
    },
  });

  show();
}
