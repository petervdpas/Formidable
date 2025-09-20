// modules/formRenderer.js

import { EventBus } from "./eventBus.js";
import { t } from "../utils/i18n.js";
import {
  buildHiddenInput,
  createLabelElement,
} from "../utils/elementBuilders.js";
import { buildButtonGroup, createToggleButtons } from "../utils/buttonUtils.js";
import { injectFieldDefaults } from "../utils/formUtils.js";
import { focusFirstInput } from "../utils/domUtils.js";
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
import { bindHotkeys, unbindHotkeys } from "../utils/hotkeyUtils.js";

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

function attachFormSavedListener({ container, section, metaData }) {
  const onSaved = (e) => {
    if (!e || !e.filename) return;
    const thisFile = metaData?._filename;
    if (!thisFile || e.filename !== thisFile) return;

    // Update “updated” label text if present
    const updatedNode = section.querySelector('[data-i18n-key="standard.updated"], .meta-updated, [data-meta="updated"]');
    if (updatedNode && e.updated) {
      updatedNode.textContent = e.updated;
    }

    // Update tags display if you show it
    const tagsNode = section.querySelector('[data-i18n-key="standard.tags"], .meta-tags, [data-meta="tags"]');
    if (tagsNode && Array.isArray(e.tags)) {
      tagsNode.textContent = e.tags.join(", ");
    }

    // Hidden mirror if you keep one
    const updatedHidden = container.querySelector('input[name="meta-updated"]');
    if (updatedHidden && e.updated) updatedHidden.value = e.updated;
  };

  EventBus.on("form:saved", onSaved);

  // Clean up when the UI is replaced
  const cleanup = () => EventBus.off("form:saved", onSaved);
  container.__formSavedCleanup = cleanup;
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
  section.id = "storage-meta";

  // ─── Flag Toggle ─────────────────────────────────────────────
  // Only show when the entry has been persisted (has created/updated in meta)
  const isSaved = Boolean(meta?.created || meta?.updated);
  if (isSaved && typeof onFlagChange === "function") {
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

  // ─── Meta Text ────────────────────────────────────────────────
  const metaText = document.createElement("div");
  metaText.className = "meta-text";

  const lines = [
    { key: "standard.filename", value: filename || "" },
    {
      key: meta.id ? "standard.id.upper" : "standard.guid.upper",
      value: meta.id || meta.guid || "",
    },
    {
      key: "standard.tags",
      value:
        Array.isArray(meta.tags) && meta.tags.length
          ? meta.tags.join(", ")
          : "",
    },
    { key: "standard.author", value: meta.author_name || "" },
    { key: "standard.email", value: meta.author_email || "" },
    { key: "standard.template", value: meta.template || "" },
    { key: "standard.created", value: meta.created || "" },
    { key: "standard.updated", value: meta.updated || "" },
  ];

  lines.forEach(({ key, value }) => {
    if (!value) return;
    const labelEl = createLabelElement({
      i18nKey: key,
      value,
      isDynamic: true,
    });
    metaText.appendChild(labelEl);
  });

  section.appendChild(metaText);

  // ─── Buttons ─────────────────────────────────────────────────
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

  // Expose buttons so the caller can bind hotkeys with tooltips
  section.__metaButtons = buttons;

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

  // Clean previous hotkeys when re-rendering
  unbindHotkeys(container);

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

  attachFormSavedListener({ container, section: metaSection, metaData });

  // ─── Apply display setting + live updates ─────────────────────
  const applyMetaVisibility = (show) => {
    if (!metaSection) return;
    metaSection.style.display = show ? "" : "none";
  };

  const cfg = await new Promise((resolve) => {
    EventBus.emit("config:load", (c) => resolve(c));
  });
  applyMetaVisibility(cfg?.show_meta_section !== false);

  // Listen for Settings toggle live-change
  EventBus.on?.("screen:meta:visibility", (enabled) => {
    applyMetaVisibility(!!enabled);
  });

  // ─── Fields ───────────────────────────────────────────────────
  const fields = template.fields || [];

  // Inject default values first
  injectFieldDefaults(fields, metaData);

  // Let fieldGroupRenderer do the job — passing metaData directly!
  await fieldGroupRenderer(
    container,
    fields,
    metaData,
    template,
    eventFunctions
  );

  // ---- ADD: bulk collapse/expand helpers (used by hotkeys)
  function setCollapsedStateForAll(root, collapsed) {
    root.querySelectorAll(".loop-item").forEach((item) => {
      item.classList.toggle("collapsed", collapsed);
      const btn = item.querySelector(".collapse-toggle");
      if (btn) btn.innerHTML = collapsed ? "▶" : "▼"; // keep arrow in sync
    });
  }
  const collapseAllLoops = () => setCollapsedStateForAll(container, true);
  const expandAllLoops = () => setCollapsedStateForAll(container, false);

  // ─── Bind page-scoped hotkeys and annotate buttons ───────────
  if (metaSection.__metaButtons) {
    const { save, delete: del, render } = metaSection.__metaButtons;

    bindHotkeys(
      container,
      [
        {
          combo: ["Ctrl+S", "Cmd+S", "Meta+S"],
          onTrigger: onSave,
          button: save,
          titleKey: "standard.save",
        },
        {
          combo: ["Ctrl+D", "Cmd+D", "Meta+D"],
          onTrigger: () => onDelete(filename),
          button: del,
          titleKey: "standard.delete",
        },
        {
          combo: ["Ctrl+R", "Cmd+R", "Meta+R"],
          onTrigger: onRender,
          button: render,
          titleKey: "standard.render",
        },
        {
          combo: ["Ctrl+M", "Cmd+M", "Meta+M"],
          onTrigger: async () => {
            const cfg = await new Promise((resolve) =>
              EventBus.emit("config:load", (c) => resolve(c))
            );
            const newValue = !(cfg?.show_meta_section ?? true);
            await EventBus.emit("config:update", {
              show_meta_section: newValue,
            });
            EventBus.emit("screen:meta:visibility", newValue);

            const label = t("config.show_meta_section");
            EventBus.emit("status:update", {
              languageKey: newValue
                ? "status.config.enabled"
                : "status.config.disabled",
              i18nEnabled: true,
              args: [label],
              variant: newValue ? "default" : "warning",
            });
          },
          titleKey: "modal.settings.display.meta",
        },
        {
          combo: ["Ctrl+Shift+C", "Cmd+Shift+C", "Meta+Shift+C"],
          onTrigger: collapseAllLoops,
          titleKey: "standard.collapse_all",
        },
        {
          combo: ["Ctrl+Shift+E", "Cmd+Shift+E", "Meta+Shift+E"],
          onTrigger: expandAllLoops,
          titleKey: "standard.expand_all",
        },
      ],
      {
        allowWhenTyping: false,
        preventDefault: true,
        stopPropagation: true,
        i18n: (key, ...args) =>
          window.i18n?.t ? window.i18n.t(key, ...args) : key,
      }
    );
  }

  focusFirstInput(container);
}
