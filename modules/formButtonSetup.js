// modules/formButtonSetup.js

import { getFormData } from "../utils/formUtils.js";
import { setupRenderModal } from "./modalSetup.js";

export function setupFormButtons({
  container,
  template,
  onSave,
  onDelete,
}) {
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
    const formData = getFormData(container, template);
    const markdown = await window.api.transform.renderMarkdownTemplate(
      formData,
      template
    );
    document.getElementById("render-output").textContent = markdown;

    const html = await window.api.transform.renderHtmlPreview(markdown);
    document.getElementById("render-preview").innerHTML = html;

    renderModal.show();
  });

  const group = document.createElement("div");
  group.className = "button-group";
  group.appendChild(saveBtn);
  group.appendChild(deleteBtn);
  group.appendChild(renderBtn);
  container.appendChild(group);

  return { saveBtn, deleteBtn, renderBtn };
}
