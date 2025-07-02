// plugins/Crazy/plugin.js
export function run() {
  const host = document.getElementById("plugin-executor");
  if (!host) return;

  const modalId = "plugin-cool-modal";
  if (document.getElementById(modalId)) return;

  const modal = document.createElement("div");
  modal.id = modalId;
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-header">
      <div class="modal-title-row">
        <h2>Injected Plugin Modal</h2>
      </div>
    </div>
    <div class="modal-body">
      <p>This is a dynamic modal from a plugin!</p>
      <button id="plugin-close-btn">Close</button>
    </div>
  `;

  host.appendChild(modal);

  const { show, hide } = FPA.modal.setupModal(modalId, {
    closeBtn: "plugin-close-btn",
    escToClose: true,
    backdropClick: true,
    width: "40%",
    height: "auto",
    onOpen: () => {
      FPA.dom.focusFirstInput(modal); // optional, good UX
    },
    onClose: () => {
      modal.remove(); // cleanup modal when closed
    },
  });

  show();

  return { message: "Modal injected with setupModal()" };
}