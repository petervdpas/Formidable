// modules/formButtonSetup.js

import { EventBus } from "./eventBus.js";
import { getFormData } from "../utils/formUtils.js";
import { setupRenderModal } from "./modalSetup.js";
import { showToast } from "./toastManager.js";

export function setupFormButtons({ container, template, onSave, onDelete }) {
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "btn btn-default btn-warn";

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "btn btn-default btn-danger";

  const renderBtn = document.createElement("button");
  renderBtn.textContent = "Render";
  renderBtn.className = "btn btn-default btn-info";

  const input = container.querySelector("#meta-json-filename");
  const renderModal = setupRenderModal();

  saveBtn.addEventListener("click", () => onSave(input?.value));
  deleteBtn.addEventListener("click", () => onDelete(input?.value));

  renderBtn.addEventListener("click", async () => {
    EventBus.emit("logging:default", ["[Render] Collecting form data..."]);
    const formData = await getFormData(container, template);

    EventBus.emit("logging:default", ["[Render] Rendering Markdown..."]);
    const markdown = await window.api.transform.renderMarkdownTemplate(
      formData,
      template
    );
    document.getElementById("render-output").textContent = markdown;

    EventBus.emit("logging:default", ["[Render] Rendering HTML preview..."]);
    const html = await window.api.transform.renderHtmlPreview(markdown);
    document.getElementById("render-preview").innerHTML = html;

    // ✅ Clipboard functionality
    const copyMarkdownBtn = document.getElementById("copy-markdown");
    const copyPreviewBtn = document.getElementById("copy-preview");

    if (copyMarkdownBtn) {
      copyMarkdownBtn.onclick = () => {
        navigator.clipboard
          .writeText(markdown)
          .then(() => {
            EventBus.emit("logging:default", [
              "✅ Markdown copied to clipboard",
            ]);
            showToast("Markdown copied", "success");
          })
          .catch((err) => {
            EventBus.emit("logging:error", ["❌ Markdown copy failed", err]);
            showToast("Failed to copy Markdown", "error");
          });
      };
    }

    if (copyPreviewBtn) {
      copyPreviewBtn.onclick = () => {
        navigator.clipboard
          .writeText(html)
          .then(() => {
            EventBus.emit("logging:default", ["✅ HTML copied to clipboard"]);
            showToast("HTML copied", "success");
          })
          .catch((err) => {
            EventBus.emit("logging:error", ["❌ HTML copy failed", err]);
            showToast("Failed to copy HTML", "error");
          });
      };
    }

    EventBus.emit("logging:default", ["[Render] Showing render modal..."]);
    renderModal.show();
  });

  const group = document.createElement("div");
  group.className = "button-group";
  group.appendChild(saveBtn);
  group.appendChild(deleteBtn);
  group.appendChild(renderBtn);
  container.appendChild(group);

  EventBus.emit("logging:default", ["[FormButtons] Buttons initialized."]);

  return { saveBtn, deleteBtn, renderBtn };
}
