// plugins/WikiWonder/plugin.js

async function performMarkdownExport({
  path,
  plugin,
  pluginName,
  selectedTemplate,
  selectedDataFile,
  outputDir,
  bulkMode,
  frontmatterMode = "keep",
  frontmatterKeys = "",
  encodeFilenames = false,
}) {
  const keysArray = frontmatterKeys
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const contextFolder = await plugin.getConfig("context_folder");
  const templateName = path.stripYamlExtension(selectedTemplate);
  const imageSrcDir = `${contextFolder}/storage/${templateName}/images`;
  const imageDestDir = `${outputDir}/.images`;

  const baseOpts = {
    selectedTemplate,
    outputDir,
    filename: null,
  };

  const imageSet = new Set();
  const t = plugin.getPluginTranslations(pluginName);

  async function renderOneFile(dataFile) {
    const opts = {
      ...baseOpts,
      selectedDataFile: dataFile,
      stripFrontmatter:
        frontmatterMode === "remove"
          ? true
          : frontmatterMode === "filter"
          ? keysArray
          : false,
    };

    const markdownPath = await plugin.saveMarkdownTo(opts);
    const content = await plugin.loadFile(markdownPath);
    const markdown = typeof content === "string" ? content : content?.data;
    if (!markdown) return;

    let updated = markdown;

    // ─── Replace image paths ─────────────────────────────────────────────
    const imageMatches = [...markdown.matchAll(/!\[.*?\]\((.*?)\)/g)];
    for (const match of imageMatches) {
      const rawPath = match[1]?.trim();
      if (!rawPath) continue;

      const filename = rawPath.split(/[\\/]/).pop();
      const encodedName = encodeFilenames
        ? encodeURIComponent(filename)
        : filename;
      const newPath = `.images/${encodedName}`;

      imageSet.add(filename);
      updated = updated.replaceAll(`](${rawPath})`, `](${newPath})`);
    }

    // ─── Replace formidable:// links with Azure Wiki links ───────────────────
    // 1) Markdown links with explicit label: [label](formidable://template.yaml:data.meta.json#frag)
    updated = updated.replace(
      /\[([^\]]+)\]\(formidable:\/\/([^():\s]+):([^\s\)#]+)(#[^\s\)]*)?\)/g,
      (m, label, templateFile, dataFileName, hash = "") => {
        const templateSlug = path.stripYamlExtension(templateFile);
        const dataSlug = path.stripMetaExtension(dataFileName);
        const wikiPath = `/${encodeURIComponent(
          templateSlug
        )}/${encodeURIComponent(dataSlug)}${hash || ""}`;
        return `[${label}](${wikiPath})`;
      }
    );

    // 2) Bare occurrences (not images): formidable://template.yaml:data.meta.json#frag
    updated = updated.replace(
      /(^|[^!\[\(])\bformidable:\/\/([^():\s]+):([^\s\)#]+)(#[^\s\)]*)?/g,
      (m, prefix, templateFile, dataFileName, hash = "") => {
        const templateSlug = path.stripYamlExtension(templateFile);
        const dataSlug = path.stripMetaExtension(dataFileName);

        // Build label (keep your CH.## smart label)
        let label = `${templateSlug}/${dataSlug}`;
        const ch = dataSlug.match(/ch(\d+)/i);
        if (ch) label = `CH.${String(ch[1]).padStart(2, "0")}`;

        const wikiPath = `/${encodeURIComponent(
          templateSlug
        )}/${encodeURIComponent(dataSlug)}${hash || ""}`;
        return `${prefix}[${label}](${wikiPath})`;
      }
    );

    // ─── Save modified markdown ──────────────────────────────────────────
    if (updated !== markdown) {
      await plugin.saveFile(markdownPath, updated);
    }
  }

  // ─── Render all files ──────────────────────────────────────────────────
  if (bulkMode) {
    const files = await plugin.getStorageFilesForTemplate(selectedTemplate);
    for (const file of files) {
      await renderOneFile(file);
    }
  } else {
    await renderOneFile(selectedDataFile);
  }

  // ─── Copy images ───────────────────────────────────────────────────────
  if (imageSet.size > 0) {
    await plugin.ensureDirectory(imageDestDir);
    for (const filename of imageSet) {
      const from = `${imageSrcDir}/${filename}`;
      const to = `${imageDestDir}/${filename}`;
      try {
        await plugin.copyFile({ from, to, overwrite: true });
      } catch (err) {
        emit("ui:toast", {
          message: t("plugin.toast.image.copy.failed", [filename, err.message]),
          variant: "error",
        });
      }
    }
  }

  emit("ui:toast", {
    message: t("plugin.toast.export.complete"),
    variant: "success",
    duration: 6000,
  });
}

async function copyToTarget({ plugin, pluginName, targetDir }) {
  const t = plugin.getPluginTranslations(pluginName);

  if (!targetDir) {
    emit("ui:toast", {
      message: t("plugin.toast.no.target"),
      variant: "error",
    });
    return;
  }

  const sourceDir = `plugins/${pluginName}/markdown`;
  const result = await plugin.copyFolder({
    from: sourceDir,
    to: targetDir,
    overwrite: true,
  });

  emit("ui:toast", {
    message: result.success
      ? t("plugin.toast.copy.success")
      : t("plugin.toast.copy.failed"),
    variant: result.success ? "success" : "error",
    duration: 7000,
  });
}

export async function run() {
  const { path, plugin, button, modal, dom } = window.FGA;
  const pluginName = "WikiWonder";

  const lang = await plugin.getConfig("language");
  await plugin.loadPluginTranslations(pluginName, lang);
  const t = plugin.getPluginTranslations(pluginName);

  setTimeout(async () => {
    const markdownRoot = `plugins/${pluginName}/markdown`;
    try {
      await plugin.emptyFolder(markdownRoot);
      emit("ui:toast", {
        message: t("plugin.toast.folder.cleared", [markdownRoot]),
        variant: "success",
        duration: 3000,
      });
    } catch (err) {
      emit("ui:toast", {
        message: t("plugin.toast.folder.failed", [err.message]),
        variant: "error",
        duration: 5000,
      });
    }
  }, 100);

  const { show } = modal.setupPluginModal({
    pluginName,
    id: "plugin-settings-wikiwonder",
    title: "WikiWonder",
    escToClose: true,
    backdropClick: true,
    width: "36em",
    height: "auto",
    resizable: false,

    prepareBody: async (modalEl, bodyEl) => {
      const [contextFolder, selectedTemplate, selectedDataFile] =
        await Promise.all([
          plugin.getConfig("context_folder"),
          plugin.getConfig("selected_template"),
          plugin.getConfig("selected_data_file"),
        ]);

      let settings = await plugin.getSettings(pluginName);
      if (!settings || typeof settings !== "object") settings = {};
      settings.targetFolder ??= "";
      settings.bulkMode ??= false;
      settings.frontmatterMode ??= "keep";
      settings.frontmatterKeys ??= "";
      settings.encodeFilenames ??= false;

      const templateName = path.stripYamlExtension(selectedTemplate);
      const outputDir = `plugins/${pluginName}/markdown/${templateName}`;

      const fields = [
        {
          key: "frontmatterMode",
          type: "dropdown",
          label: t("plugin.field.frontmatterMode"),
          options: [
            { value: "keep", label: t("plugin.option.keep") },
            { value: "remove", label: t("plugin.option.remove") },
            { value: "filter", label: t("plugin.option.filter") },
          ],
          wrapper: "modal-form-row",
          fieldRenderer: "renderDropdownField",
          value: settings.frontmatterMode,
        },
        {
          key: "frontmatterKeys",
          type: "text",
          label: t("plugin.field.frontmatterKeys"),
          wrapper: "modal-form-row",
          fieldRenderer: "renderTextField",
          value: settings.frontmatterKeys,
          visible: settings.frontmatterMode === "filter",
        },
        {
          key: "targetFolder",
          type: "directory",
          label: t("plugin.field.targetFolder"),
          wrapper: "modal-form-row tight-gap",
          fieldRenderer: "renderDirectoryField",
          value: settings.targetFolder,
        },
        {
          key: "bulkMode",
          type: "boolean",
          label: t("plugin.field.bulkMode"),
          wrapper: "modal-form-row switch-row",
          fieldRenderer: "renderBooleanField",
          value: settings.bulkMode,
        },
        {
          key: "encodeFilenames",
          type: "boolean",
          label: t("plugin.field.encodeFilenames"),
          wrapper: "modal-form-row switch-row",
          fieldRenderer: "renderBooleanField",
          value: settings.encodeFilenames,
        },
      ];

      const fieldManager = dom.createFieldManager({
        container: bodyEl,
        fields,
        data: {
          bulkMode: settings.bulkMode,
          targetFolder: settings.targetFolder,
          frontmatterMode: settings.frontmatterMode,
          frontmatterKeys: settings.frontmatterKeys,
          encodeFilenames: settings.encodeFilenames,
        },
        injectBefore: () => {
          const info = document.createElement("p");
          info.textContent = t("plugin.info.markdownExport", [pluginName]);
          info.className = "form-info-text";
          return info;
        },
      });

      await fieldManager.renderFields();

      const saveBtn = button.createButton({
        text: t("plugin.button.save.settings"),
        className: "btn-warn",
        onClick: async () => {
          const values = fieldManager.getValues();
          settings.targetFolder = values.targetFolder;
          settings.bulkMode = Boolean(values.bulkMode);
          settings.frontmatterMode = values.frontmatterMode;
          settings.frontmatterKeys = values.frontmatterKeys;
          settings.encodeFilenames = Boolean(values.encodeFilenames);

          const result = await plugin.saveSettings(pluginName, settings);
          emit("ui:toast", {
            message: result?.success
              ? t("plugin.toast.settings.saved")
              : t("plugin.toast.settings.failed"),
            variant: result?.success ? "success" : "error",
          });
        },
      });

      const renderBtn = button.createButton({
        text: t("plugin.button.render.markdown"),
        className: "btn-info",
        onClick: async () => {
          const values = fieldManager.getValues();
          await performMarkdownExport({
            path,
            plugin,
            pluginName,
            selectedTemplate,
            selectedDataFile,
            outputDir,
            bulkMode: Boolean(values.bulkMode),
            frontmatterMode: values.frontmatterMode,
            frontmatterKeys: values.frontmatterKeys,
            encodeFilenames: Boolean(values.encodeFilenames),
          });
        },
      });

      const copyBtn = button.createButton({
        text: t("plugin.button.copy.target"),
        className: "btn-okay",
        onClick: async () => {
          const targetDir = fieldManager.getValues().targetFolder;
          await copyToTarget({ plugin, pluginName, targetDir });
        },
      });

      bodyEl.appendChild(button.buildButtonGroup(saveBtn, renderBtn, copyBtn));
    },
  });

  show();
}
