// controls/serverDataProvider.js

const fs = require("fs");
const path = require("path");
const configManager = require("./configManager");
const formManager = require("./formManager");
const templateManager = require("./templateManager");
const { renderMarkdown } = require("./markdownRenderer");
const { marked } = require("marked");
const hljs = require("highlight.js");

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

const renderer = new marked.Renderer();
renderer.code = (code, infostring) => {
  const lang = (infostring || "").trim().split(/\s+/)[0].toLowerCase();
  const mapped = LANG_ALIASES[lang] || lang;

  if (mapped && hljs.getLanguage(mapped)) {
    const html = hljs.highlight(code, {
      language: mapped,
      ignoreIllegals: true,
    }).value;
    return `<pre class="hljs"><code class="language-${mapped}">${html}</code></pre>\n`;
  }

  // fallback (escape only)
  const esc = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
  const templateYaml = await loadTemplateYaml(templateName);
  const fields = templateYaml?.fields || [];
  const templateFolder = templateName.replace(/\.yaml$/i, "");

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

  md = md.replace(
    /\[([^\]]+)\]\(formidable:\/\/([^():\s]+):([^)]+)\)/g,
    (m, label, templateFile, dataFile2) => {
      const tName = templateFile.replace(/\.yaml$/i, "");
      const href = `/template/${encodeURIComponent(
        tName
      )}/form/${encodeURIComponent(dataFile2)}`;
      return `[${label}](${href})`;
    }
  );

  md = md.replace(
    /(^|[^!])\bformidable:\/\/([^():\s]+):([^\s)]+)/g,
    (match, prefix, templateFile, dataFile2) => {
      const tName = templateFile.replace(/\.yaml$/i, "");
      const href = `/template/${encodeURIComponent(
        tName
      )}/form/${encodeURIComponent(dataFile2)}`;
      const full = `formidable://${templateFile}:${dataFile2}`;
      return `${prefix}[${full}](${href})`;
    }
  );

  md = md.replace(/^---[\s\S]*?---\n+/, "");

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

  html = html.replace(/(^|[\s>])#([\w.\-]+)/g, (m, pre, tag) => {
    return `${pre}<span class="inline-tag">#${tag}</span>`;
  });

  html = html.replace(
    /<a\s+href="\/template\/[^"]+\/form\/[^"]+">([^<]+)<\/a>/gi,
    (full) => full.replace("<a ", '<a class="wiki-link" ')
  );

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

  return { template: templateYaml, form: formData, md, html };
}

function normalizeTags(val) {
  if (Array.isArray(val)) {
    return val
      .map((t) => String(t).replace(/^#/, "").trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof val === "string") {
    return val
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, "").trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function isCollectionEnabled(yaml) {
  return !!(
    yaml &&
    yaml.enable_collection === true &&
    templateManager.getGuidFieldKey(yaml?.fields || [])
  );
}

function statRev(absPath) {
  try {
    const st = fs.statSync(absPath);
    const etag = `W/"${st.size}-${Math.floor(st.mtimeMs)}"`;
    const lastModified = new Date(st.mtimeMs).toUTCString();
    return { etag, lastModified, mtimeMs: st.mtimeMs, size: st.size };
  } catch {
    return { etag: 'W/"0-0"', lastModified: new Date(0).toUTCString() };
  }
}

async function collectionRev(templateName) {
  const storagePath = configManager.getTemplateStoragePath(templateName);
  const files = formManager.listForms(templateName) || [];
  let maxMtime = 0;
  for (const file of files) {
    try {
      const st = fs.statSync(path.join(storagePath, file));
      maxMtime = Math.max(maxMtime, st.mtimeMs);
    } catch {}
  }
  const etag = `W/"${files.length}-${Math.floor(maxMtime)}"`;
  const lastModified = new Date(maxMtime || 0).toUTCString();
  return { etag, lastModified };
}

async function listCollection(
  templateName,
  { limit = 100, offset = 0, q = "", tags = "", include = "summary" } = {}
) {
  const yaml = await loadTemplateYaml(templateName);
  if (!isCollectionEnabled(yaml)) return { collectionEnabled: false };

  const files = formManager.listForms(templateName) || [];
  const fields = yaml.fields || [];
  const itemFieldKey = (yaml.item_field || "").trim();
  const guidKey = templateManager.getGuidFieldKey(yaml?.fields || []);
  const tagsKey = templateManager.getTagsFieldKey(yaml.fields || []);

  const ql = String(q || "").toLowerCase();
  const tagFilter = normalizeTags(tags);
  const itemsAll = [];

  const storagePath = configManager.getTemplateStoragePath(templateName);
  const templateId = templateName.replace(/\.yaml$/i, "");
  const wantData = include === "data" || include === "all";
  const wantMeta = include === "meta" || include === "all";

  for (const filename of files) {
    const form = formManager.loadForm(templateName, filename, fields);
    if (!form) continue;

    const guid = String(form?.data?.[guidKey] ?? "");
    if (!guid) continue;

    const title =
      form?.title || (itemFieldKey && form?.data?.[itemFieldKey]) || filename;

    const itemTags = tagsKey ? normalizeTags(form?.data?.[tagsKey]) : [];

    if (ql) {
      const hay = `${String(title).toLowerCase()} ${itemTags.join(" ")}`;
      if (!hay.includes(ql)) continue;
    }
    if (tagFilter.length) {
      const set = new Set(itemTags);
      if (!tagFilter.every((t) => set.has(t))) continue;
    }

    if (wantData || wantMeta) {
      const rev = statRev(path.join(storagePath, filename));
      itemsAll.push({
        template: templateId,
        id: guid,
        filename,
        title: String(title),
        ...(wantMeta ? { meta: form.meta || {} } : {}),
        ...(wantData ? { data: form.data || {} } : {}),
        links: {
          self: `/api/collections/${encodeURIComponent(
            templateId
          )}/${encodeURIComponent(guid)}`,
          html: `/template/${encodeURIComponent(
            templateId
          )}/form/${encodeURIComponent(filename)}`,
        },
        rev: { etag: rev.etag, lastModified: rev.lastModified },
      });
    } else {
      itemsAll.push({
        id: guid,
        filename,
        title: String(title),
        tags: itemTags,
        href: `/api/collections/${encodeURIComponent(
          templateId
        )}/${encodeURIComponent(guid)}`,
      });
    }
  }

  const total = itemsAll.length;
  const items = itemsAll.slice(offset, offset + limit);

  return {
    collectionEnabled: true,
    template: templateName.replace(/\.yaml$/i, ""),
    total,
    limit,
    offset,
    items,
  };
}

async function resolveFormById(templateName, guid) {
  const yaml = await loadTemplateYaml(templateName);
  const fields = yaml?.fields || [];
  const storagePath = configManager.getTemplateStoragePath(templateName);
  const files = formManager.listForms(templateName) || [];

  const guidKey = templateManager.getGuidFieldKey(yaml?.fields || []);
  if (!guidKey) return { ok: false, code: 400, reason: "guid-missing" };

  for (const filename of files) {
    const form = formManager.loadForm(templateName, filename, fields);
    if (!form) continue;
    if (String(form?.data?.[guidKey]) === String(guid)) {
      return {
        ok: true,
        template: yaml,
        form,
        formFile: filename,
        absPath: path.join(storagePath, filename),
      };
    }
  }
  return { ok: false, code: 404, reason: "not-found" };
}

module.exports = {
  getVirtualStructure,
  extendedListForms,
  loadTemplateYaml,
  loadFormFile,
  loadAndRenderForm,

  listCollection,
  resolveFormById,
  isCollectionEnabled,
  statRev,
  collectionRev,
};
