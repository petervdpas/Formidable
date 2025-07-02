// plugins/Crazy/plugin.js
export function run() {
  const { setupPluginModal } = window.FPA.modal;
  const { createButton } = window.FPA.button;

  const { show } = setupPluginModal({
    id: "plugin-example-modal",
    title: "Plugin Injected",
    body: "",

    prepareBody: (modal, bodyEl) => {
      const p = document.createElement("p");
      p.textContent = "Hello to a Formidable World! This is a plugin-injected modal.";
      bodyEl.appendChild(p);

      const btn = createButton({
        text: "Toast!",
        className: "btn-success",
        onClick: () =>
          emit("ui:toast", { message: "Plugin says hi!", variant: "success" }),
        ariaLabel: "Send toast",
      });
      bodyEl.appendChild(btn);
    },
  });

  show();
}
