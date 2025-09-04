// controls/serverDataProvider.js

const configManager   = require("./configManager");
const formManager     = require("./formManager");
const templateManager = require("./templateManager");
const { renderMarkdown } = require("./markdownRenderer");

// marked + highlight.js
const { marked } = require("marked");
const hljs = require("highlight.js");

// map common fence names to hljs languages
const LANG_ALIASES = {
  "c#": "csharp",
  cs: "csharp",
  js: "javascript",
  ts: "typescript",
  ps: "powershell",
  ps1: "powershell",
  shell: "bash",
  sh: "bash",
  yml: "yaml",
};

// configure marked to emit hljs markup
const renderer = new marked.Renderer();
renderer.code = (code, infostring) => {
  const lang = (infostring || "").trim().split(/\s+/)[0].toLowerCase();
  const mapped = LANG_ALIASES[lang] || lang;

  if (mapped && hljs.getLanguage(mapped)) {
    const html = hljs.highlight(code, { language: mapped, ignoreIllegals: true }).value;
    return `<pre class="hljs"><code class="language-${mapped}">${html}</code></pre>\n`;
  }

  // fallback (escape only)
  const esc = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<pre class="hljs"><code>${esc}</code></pre>\n`;
};

marked.setOptions({
  renderer,
  langPrefix: "language-",
});

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
  const templateYaml   = await loadTemplateYaml(templateName);
  const fields         = templateYaml?.fields || [];
  const templateFolder = templateName.replace(/\.yaml$/i, "");

  const formData = formManager.loadForm(templateName, dataFile, fields);

  if (!templateYaml || !formData) {
    return { template: templateYaml || null, form: formData || null, md: null, html: null };
  }

  let md = renderMarkdown(formData.data, templateYaml);

  // formidable://template.yaml:form.json → internal link
  md = md.replace(
    /(^|[^!])\bformidable:\/\/([^\s:]+):([^\s)]+)/g,
    (match, prefix, templateFile, dataFile) => {
      const tName = templateFile.replace(/\.yaml$/i, "");
      const href  = `/template/${encodeURIComponent(tName)}/form/${encodeURIComponent(dataFile)}`;
      const full  = `formidable://${templateFile}:${dataFile}`;
      return `${prefix}[${full}](${href})`;
    }
  );

  // strip frontmatter
  md = md.replace(/^---[\s\S]*?---\n+/, "");

  // file://image → /storage/<template>/images/<file>
  md = md.replace(
    /!\[([^\]]*?)\]\(file:\/\/([^)]+?)\)/g,
    (full, alt, filePath) => {
      const parts  = filePath.split(/[\\/]/);
      const imgFile = parts[parts.length - 1];
      return `![${alt}](/storage/${encodeURIComponent(templateFolder)}/images/${encodeURIComponent(imgFile)})`;
    }
  );

  // render with marked (now emits hljs markup)
  let html = marked.parse(md);

  // inline #tags → span
  html = html.replace(/(^|[\s>])#([\w.\-]+)/g, (m, pre, tag) => {
    return `${pre}<span class="inline-tag">#${tag}</span>`;
  });

  // wiki-link class on internal links
  html = html.replace(
    /<a\s+href="\/template\/[^"]+\/form\/[^"]+">([^<]+)<\/a>/gi,
    (full) => full.replace("<a ", '<a class="wiki-link" ')
  );

  // patch residual file:// images in HTML
  html = html.replace(
    /<img\s+[^>]*src=["']file:\/\/([^"']+)["'][^>]*>/gi,
    (match, filePath) => {
      const parts   = filePath.split(/[\\/]/);
      const imgFile = parts[parts.length - 1];
      return match.replace(
        `file://${filePath}`,
        `/storage/${encodeURIComponent(templateFolder)}/images/${encodeURIComponent(imgFile)}`
      );
    }
  );

  return { template: templateYaml, form: formData, md, html };
}

module.exports = {
  getVirtualStructure,
  extendedListForms,
  loadTemplateYaml,
  loadFormFile,
  loadAndRenderForm,
};
