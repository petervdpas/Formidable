// controls/serverDataProvider.js

const configManager = require('./configManager');
const formManager = require('./formManager');
const templateManager = require('./templateManager');
const { renderMarkdown } = require("./markdownRenderer");
const marked = require("marked");

async function getVirtualStructure() {
  return configManager.getVirtualStructure();
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

  const formData = formManager.loadForm(templateName, dataFile, fields);

  if (!templateYaml || !formData) {
    return {
      template: templateYaml || null,
      form: formData || null,
      md: null,
      html: null,
    };
  }

  // Generate Markdown from form
  let md = renderMarkdown(formData.data, templateYaml);

  // Strip frontmatter if present (---\n ... \n---)
  md = md.replace(/^---[\s\S]*?---\n+/, "");

  // Parse to HTML
  let html = marked.parse(md);

  // Fix image paths also in final HTML (patch any <img> src=)
  const templateFolder = templateName.replace(/\.yaml$/i, "");

  html = html.replace(/<img\s+[^>]*src=["']file:\/\/([^"']+)["'][^>]*>/gi, (match, filePath) => {
    const parts = filePath.split(/[\\/]/);
    const imgFile = parts[parts.length - 1];
    return match.replace(`file://${filePath}`, `/storage/${encodeURIComponent(templateFolder)}/images/${encodeURIComponent(imgFile)}`);
  });

  return {
    template: templateYaml,
    form: formData,
    md,
    html,
  };
}

module.exports = {
  getVirtualStructure,
  loadTemplateYaml,
  loadFormFile,
  loadAndRenderForm,
};
