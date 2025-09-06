// /modules/sidebarManager.js

import { EventBus } from "./eventBus.js";
import { ensureVirtualLocation } from "../utils/vfsUtils.js";
import { getUserConfig } from "../utils/configUtil.js";
import { evaluateExpression } from "../utils/transformationUtils.js";
import { stripMetaExtension } from "../utils/pathUtils.js";
import {
  buildSwitchElement,
  buildExpressionLabel,
  addContainerElement,
  createFilterField,
} from "../utils/elementBuilders.js";
import { createListManager } from "../utils/listUtils.js";
import { createAddButton } from "./uiButtons.js";
import { t } from "../utils/i18n.js";

export function createTemplateListManager(modal, dropdown = null) {
  const listManager = createListManager({
    elementId: "template-list",
    itemClass: "template-item",

    fetchListFunction: async () => {
      const filenames = await new Promise((resolve) => {
        EventBus.emit("template:list", { callback: resolve });
      });

      const enriched = await Promise.all(
        filenames.map(async (filename) => {
          const descriptor = await new Promise((resolve) => {
            EventBus.emit("template:descriptor", {
              name: filename,
              callback: resolve,
            });
          });

          return {
            display: descriptor?.yaml?.name || stripMetaExtension(filename),
            value: filename,
            rawData: descriptor, // optional if you need to pass full YAML later
          };
        })
      );

      return enriched;
    },

    onItemClick: (templateItem) =>
      EventBus.emit("template:list:itemClicked", templateItem),

    emptyMessage: t("special.noTemplatesFound"),

    addButton: createAddButton({
      label: t("button.addTemplate"),
      onClick: async () => {
        EventBus.emit("modal:template:confirm", {
          modal,
          callback: async ({ template, yaml }) => {
            try {
              // Save template via EventBus
              const success = await new Promise((resolve) => {
                EventBus.emit("template:save", {
                  name: template,
                  data: yaml,
                  callback: resolve,
                });
              });

              if (!success) {
                throw new Error("Save failed");
              }

              await listManager.loadList();

              if (dropdown?.refresh) await dropdown.refresh();

              EventBus.emit("template:selected", {
                name: template,
                yaml,
              });

              EventBus.emit("status:update", {
                message: "status.template.create.new",
                languageKey: "status.template.create.new",
                i18nEnabled: true,
                args: [template],
              });
            } catch (err) {
              EventBus.emit("status:update", {
                message: "status.template.create.new.error",
                languageKey: "status.template.create.new.error",
                i18nEnabled: true,
                args: [err.message],
                log: true,
                logLevel: "error",
                logOrigin: "sidebarManager:AddTemplate",
              });
            }
          },
        });
      },
    }),
  });

  return {
    ...listManager,
    reloadList: () => listManager.loadList(),
  };
}

export function createStorageListManager(formManager, modal) {
  let showOnlyFlagged = false;
  let activeTags = [];
  let listManager = null;

  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  // --- helper: detect whether the template defines a tags field anywhere
  const hasTagsFieldDeep = (node) => {
    if (!node) return false;
    if (Array.isArray(node)) return node.some(hasTagsFieldDeep);
    if (typeof node === "object") {
      // direct hits
      const type = String(
        node.type || node.component || node.fieldType || ""
      ).toLowerCase();
      const idLike = String(
        node.id || node.key || node.name || ""
      ).toLowerCase();
      if (type === "tags" || idLike === "tags") return true;
      // recurse into values
      return Object.values(node).some(hasTagsFieldDeep);
    }
    return false;
  };

  // ── Flag toggle ─────────────────────────────────────────────
  const { element: flaggedWrapper } = buildSwitchElement({
    id: "flagged-toggle",
    name: "flagged-toggle",
    checked: showOnlyFlagged,
    trailingValues: ["special.showFlagged", "special.showAll"],
    onFlip: async (value) => {
      showOnlyFlagged = value;
      const selected_datafile = await getUserConfig("selected_data_file");
      const name = window.currentSelectedDataFile || selected_datafile;
      listManager.renderList(undefined, () => {
        if (name) EventBus.emit("form:list:highlighted", name);
        EventBus.emit("status:update", {
          message: "status.loaded.items",
          languageKey: "status.loaded.items",
          i18nEnabled: true,
          args: [listManager.getFilteredCount(), listManager.getItemCount()],
        });
      });
    },
    i18nEnabled: true,
  });

  // ── Build filter UI (single wrapper is provided by createListManager) ──
  const filterFrag = document.createDocumentFragment();

  // Row 1: label + flag switch (always shown)
  const flaggedRow = document.createElement("div");
  flaggedRow.className = "filter-chunk";
  addContainerElement({
    parent: flaggedRow,
    tag: "label",
    className: "filter-label",
    i18nKey: "special.filterFlagged",
    textContent: t("special.filterFlagged") || "Marked items",
    attributes: { for: "flagged-toggle" },
  });
  flaggedRow.appendChild(flaggedWrapper);
  filterFrag.appendChild(flaggedRow);

  // Row 2: clearable tag field (conditionally shown)
  const tagsField = createFilterField({
    id: "tag-filter-input",
    labelKey: "special.filterByTags",
    placeholder:
      t("special.filterByTags.placeholder") || "Enter tag(s) to filter…",
    size: "sm",
    onInput: (val) => {
      activeTags = (val || "")
        .split(/[, \t\n]+/)
        .map((s) => norm(s.trim()))
        .filter(Boolean);
      listManager.renderList();
    },
  });
  // add now, but we’ll toggle visibility
  filterFrag.appendChild(tagsField.element);

  const setTagsFilterVisible = (visible) => {
    tagsField.element.style.display = visible ? "" : "none";
    if (!visible) {
      // clear any active filter so list isn't “stuck” empty
      activeTags = [];
      tagsField.input.value = "";
    }
  };

  // ── List manager ───────────────────────────────────────────
  listManager = createListManager({
    elementId: "storage-list",
    itemClass: "storage-item",

    fetchListFunction: async () => {
      const template = await ensureVirtualLocation(
        window.currentSelectedTemplate
      );
      if (!template || !template.virtualLocation) {
        // no template context -> hide tag filter
        setTagsFilterVisible(false);
        return [];
      }

      await EventBus.emitWithResponse("form:ensureDir", template.filename);

      const descriptor = await new Promise((resolve) => {
        EventBus.emit("template:descriptor", {
          name: template.filename,
          callback: resolve,
        });
      });

      // Toggle tag filter visibility based on template YAML
      const yaml = descriptor?.yaml || {};
      const templateHasTags = hasTagsFieldDeep(yaml) === true;
      setTagsFilterVisible(templateHasTags);

      const sidebarExpr = yaml?.sidebar_expression || null;

      const entries = await new Promise((resolve) => {
        EventBus.emit("form:extendedList", {
          templateFilename: template.filename,
          callback: resolve,
        });
      });

      return entries.map((entry) => ({
        display: entry.title || stripMetaExtension(entry.filename),
        value: entry.filename,
        flagged: entry.meta?.flagged || false,
        id: entry.meta?.id || "",
        sidebarContext: entry.expressionItems || {},
        sidebarExpr,
        tagsNorm: Array.isArray(entry.meta?.tags)
          ? entry.meta.tags.map((s) => norm(s))
          : [],
      }));
    },

    onItemClick: (storageItem) =>
      EventBus.emit("form:list:itemClicked", storageItem),

    emptyMessage: t("special.noMetadataFilesFound"),

    renderItemExtra: async ({ subLabelNode, flagNode, rawData }) => {
      if (rawData.flagged) {
        const wrap = document.createElement("span");
        wrap.className = "flag-icon-wrapper";
        const flagIcon = document.createElement("i");
        flagIcon.className = "fa fa-flag";
        flagIcon.style.pointerEvents = "none";
        wrap.appendChild(flagIcon);
        flagNode.appendChild(wrap);
      }

      subLabelNode.innerHTML = "";

      const enabled = await getUserConfig("use_expressions");
      if (!enabled || !rawData.sidebarExpr || !rawData.sidebarContext) return;

      try {
        const result = await evaluateExpression({
          expr: rawData.sidebarExpr,
          context: rawData.sidebarContext,
          fallbackId: rawData.id,
          throwOnError: true,
        });

        if (result?.text) {
          const exprEl = buildExpressionLabel({
            text: result.text,
            classes: result.classes ?? [],
          });
          subLabelNode.appendChild(exprEl);
        }
      } catch {
        const fallback = buildExpressionLabel({
          text: "[EXPR ERROR]",
          classes: ["expr-text-red", "expr-bold"],
        });
        subLabelNode.appendChild(fallback);
      }
    },

    // Flag + loose tag (ANY) filter
    filterFunction: (item) => {
      if (showOnlyFlagged && !item.flagged) return false;
      if (!activeTags.length) return true;
      if (!Array.isArray(item.tagsNorm) || !item.tagsNorm.length) return false;
      return activeTags.some((q) => item.tagsNorm.some((tg) => tg.includes(q)));
    },

    // Injected once; re-renders won’t duplicate it.
    filterUI: filterFrag,

    addButton: createAddButton({
      label: t("button.addEntry"),
      onClick: async () => {
        const template = window.currentSelectedTemplate;
        if (!template) {
          EventBus.emit("status:update", {
            message: "status.template.first.select",
            languageKey: "status.template.first.select",
            i18nEnabled: true,
          });
          return;
        }

        EventBus.emit("modal:entry:confirm", {
          modal,
          callback: async (datafile) => {
            await formManager.loadFormData({}, datafile);
          },
        });
      },
    }),
  });

  return { ...listManager, reloadList: () => listManager.loadList() };
}
