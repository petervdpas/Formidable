// controls/serverDataProvider.js

const configManager = require("./configManager");
const formManager = require("./formManager");
const templateManager = require("./templateManager");
const { renderMarkdown } = require("./markdownRenderer");
const marked = require("marked");

async function getVirtualStructure() {
  return configManager.getVirtualStructure();
}

async function extendedListForms(templateName) {
  return formManager.extendedListForms(templateName);
}

async function loadTemplateYaml(templateFilename) {
  if (!templateFilename) return null;
  return templateManager.loadTemplate(templateFilename);
}

async function loadFormFile(templateName, dataFile) {
  const templateYaml = await loadTemplateYaml(templateName);
  const fields = templateYaml?.fields || [];
  return formManager.loadForm(templateName, dataFile, fields);
}

async function loadAndRenderForm(templateName, dataFile) {
  const templateYaml = await loadTemplateYaml(templateName);
  const fields = templateYaml?.fields || [];
  const templateFolder = templateName.replace(/\.yaml$/i, ""); // ✅ moved here

  const formData = formManager.loadForm(templateName, dataFile, fields);

  if (!templateYaml || !formData) {
    return {
      template: templateYaml || null,
      form: formData || null,
      md: null,
      html: null,
    };
  }

  let md = renderMarkdown(formData.data, templateYaml);

  // Replace formidable:// links with internal wiki links
  md = md.replace(
    /(^|[^!])\bformidable:\/\/([^\s:]+):([^\s)]+)/g,
    (match, prefix, templateFile, dataFile) => {
      const templateName = templateFile.replace(/\.yaml$/i, "");
      const href = `/template/${encodeURIComponent(
        templateName
      )}/form/${encodeURIComponent(dataFile)}`;
      const full = `formidable://${templateFile}:${dataFile}`;
      return `${prefix}[${full}](${href})`;
    }
  );

  // Strip frontmatter if present
  md = md.replace(/^---[\s\S]*?---\n+/, "");

  // Patch file:// image paths in markdown
  md = md.replace(
    /!\[([^\]]*?)\]\(file:\/\/([^)]+?)\)/g,
    (full, alt, filePath) => {
      const parts = filePath.split(/[\\/]/);
      const imgFile = parts[parts.length - 1];
      return `![${alt}](/storage/${encodeURIComponent(
        templateFolder
      )}/images/${encodeURIComponent(imgFile)})`;
    }
  );

  let html = marked.parse(md);

  html = html.replace(
    /<a\s+href="\/template\/[^"]+\/form\/[^"]+">([^<]+)<\/a>/gi,
    (full, text) => {
      return full.replace("<a ", '<a class="wiki-link" ');
    }
  );

  // Patch image tags in HTML (in case some slipped through)
  html = html.replace(
    /<img\s+[^>]*src=["']file:\/\/([^"']+)["'][^>]*>/gi,
    (match, filePath) => {
      const parts = filePath.split(/[\\/]/);
      const imgFile = parts[parts.length - 1];
      return match.replace(
        `file://${filePath}`,
        `/storage/${encodeURIComponent(
          templateFolder
        )}/images/${encodeURIComponent(imgFile)}`
      );
    }
  );

  return {
    template: templateYaml,
    form: formData,
    md,
    html,
  };
}

module.exports = {
  getVirtualStructure,
  extendedListForms,
  loadTemplateYaml,
  loadFormFile,
  loadAndRenderForm,
};
