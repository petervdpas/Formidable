// plugins/Crazy/plugin.js
export function run() {
  const { button, modal } = window.FPA;
  const { createButton } = button;
  const { setupPluginModal } = modal;

  const { show } = setupPluginModal({
    id: "plugin-example-modal",
    title: "Plugin Injected",
    body: "",

    prepareBody: (modalEl, bodyEl) => {
      const p = document.createElement("p");
      p.textContent =
        "Hello to a Formidable World! This is a plugin-injected modal.";
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
