// modules/formRenderer.js

import { buildHiddenInput } from "../utils/elementBuilders.js";
import { buildButtonGroup, createToggleButtons } from "../utils/buttonUtils.js";
import { injectFieldDefaults, buildShadowData } from "../utils/formUtils.js";
import { applyFieldValues, focusFirstInput } from "../utils/domUtils.js";
import {
  createFlaggedToggleButton,
  createFormSaveButton,
  createFormSaveIconButton,
  createFormDeleteButton,
  createFormDeleteIconButton,
  createFormRenderButton,
  createFormRenderIconButton,
} from "./uiButtons.js";
import { fieldGroupRenderer } from "../utils/fieldGroupRenderer.js";

// ─────────────────────────────────────────────
// Generic Events helper
// ─────────────────────────────────────────────
function getEventFunctions() {
  return {
    fetchTemplates: async () => {
      return await EventBus.emitWithResponse("vfs:listTemplates", null);
    },
    fetchMetaFiles: async (templateName) => {
      return await EventBus.emitWithResponse("vfs:getTemplateMetaFiles", {
        templateName,
      });
    },
  };
}

async function buildMetaSection(
  meta,
  filename,
  flaggedInitial = false,
  onFlagChange = null,
  onSave,
  onDelete,
  onRender
) {
  const section = document.createElement("div");
  section.className = "meta-section";

  if (typeof onFlagChange === "function") {
    let flagged = flaggedInitial;

    const flaggedBtn = createFlaggedToggleButton(flagged, () => {
      flagged = !flagged;
      flaggedBtn.classList.toggle("btn-flagged", flagged);
      flaggedBtn.classList.toggle("btn-unflagged", !flagged);
      onFlagChange(flagged);
    });

    const flaggedContainer = document.createElement("div");
    flaggedContainer.className = "flagged-toggle-container";
    flaggedContainer.appendChild(flaggedBtn);
    section.appendChild(flaggedContainer);
  }

  const metaText = document.createElement("div");
  metaText.className = "meta-text";

  const metaLines = [`Filename: ${filename || ""}`];

  if (meta.id) {
    metaLines.push(`ID: ${meta.id}`);
  } else if (meta.guid) {
    metaLines.push(`GUID: ${meta.guid}`);
  }

  metaLines.push(
    `Author: ${meta.author_name || ""}`,
    `Email: ${meta.author_email || ""}`,
    `Template: ${meta.template || ""}`,
    `Created: ${meta.created || ""}`,
    `Updated: ${meta.updated || ""}`
  );

  metaLines.forEach((line) => {
    const div = document.createElement("div");
    div.textContent = line;
    metaText.appendChild(div);
  });

  section.appendChild(metaText);

  const buttons = await createToggleButtons(
    {
      save: onSave,
      delete: () => onDelete(filename),
      render: onRender,
    },
    {
      icon: {
        save: createFormSaveIconButton,
        delete: createFormDeleteIconButton,
        render: createFormRenderIconButton,
      },
      label: {
        save: createFormSaveButton,
        delete: createFormDeleteButton,
        render: createFormRenderButton,
      },
    }
  );

  const wrapper = document.createElement("div");
  wrapper.className = "meta-wrapper";
  wrapper.appendChild(metaText);
  wrapper.appendChild(
    buildButtonGroup(
      buttons.save,
      buttons.delete,
      buttons.render,
      "meta-actions"
    )
  );

  section.appendChild(wrapper);

  return section;
}

export async function renderFormUI(
  container,
  template,
  metaData,
  onSave,
  onDelete,
  onRender
) {
  const eventFunctions = getEventFunctions();

  container.innerHTML = "";
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const filename = metaData._filename || "";
  const flagged = metaData.meta?.flagged || false;

  const filenameInput = buildHiddenInput("meta-json-filename", filename);
  container.appendChild(filenameInput);

  const flaggedInput = buildHiddenInput(
    "meta-flagged",
    flagged ? "true" : "false"
  );
  container.appendChild(flaggedInput);

  const metaSection = await buildMetaSection(
    metaData.meta || {},
    filename,
    flagged,
    (newFlagged) => {
      flaggedInput.value = newFlagged ? "true" : "false";
    },
    onSave,
    () => onDelete(filename),
    onRender
  );
  container.appendChild(metaSection);

  const fields = template.fields || [];
  injectFieldDefaults(fields, metaData);
  await fieldGroupRenderer(
    container,
    fields,
    metaData,
    template,
    eventFunctions
  );

  const shadowData = buildShadowData(fields, metaData);
  // You can log or inspect this:
  console.log("[ShadowData] Structured shadow copy:", shadowData);

  await applyFieldValues(container, template, metaData, eventFunctions);
  focusFirstInput(container);
}
