// controls/helpManager.js

const fileManager = require("./fileManager");
const matter = require("gray-matter");

const helpCache = Object.create(null); // { [lang]: { [id]: HelpTopic } }

function getHelpFolder() {
  return fileManager.resolveAssetPath("help");
}

function parseLangFromFilename(name) {
  // support: index.md  |  index.nl.md  |  getting-started.en-US.md
  const m = name.match(/^(.*)\.([a-z]{2}(?:-[A-Z]{2})?)\.md$/);
  return m
    ? { base: m[1], lang: m[2] }
    : { base: name.replace(/\.md$/, ""), lang: null };
}

function collectMarkdownEntries(dirPath) {
  return (
    fileManager.listDirectoryEntries(dirPath, { silent: true }) || []
  ).filter((e) => e.isFile && e.name.endsWith(".md"));
}

function loadMd(fullPath) {
  const raw = fileManager.loadFile(fullPath, { format: "text", silent: true });
  return matter(raw);
}

function normalizeImageLinks(md, lang) {
  // Go through the internal server's /assets route
  const langPrefix = `/assets/help/${lang}/images/`;

  md = md
    .replace(/(!\[[^\]]*\]\()\s*(?:\.{0,2}\/)?images\//gi, `$1${langPrefix}`)
    .replace(/(\[[^\]]*\]\()\s*(?:\.{0,2}\/)?images\//gi, `$1${langPrefix}`);

  md = md.replace(
    /(<img[^>]*\bsrc=["'])\s*(?:\.{0,2}\/)?images\//gi,
    `$1${langPrefix}`
  );

  return md;
}

/**
 * Build a language view into cache with fallback chain:
 * 1) help/<lang>/*.md
 * 2) help/*.<lang>.md
 * 3) help/*.md               (neutral default)
 * Frontmatter may specify { id, title, order, lang } and can override filename-derived lang.
 */
function ensureLangLoaded(lang = "en") {
  if (helpCache[lang]) return;

  const baseDir = getHelpFolder();                         // assets/help
  const langDir = fileManager.joinPath(baseDir, lang);     // assets/help/<lang>
  const result = Object.create(null); // by id

  // 3) Neutral files (lowest precedence)
  for (const entry of collectMarkdownEntries(baseDir)) {
    const { base, lang: suffix } = parseLangFromFilename(entry.name);
    if (suffix) continue; // neutral step only
    const fullPath = fileManager.joinPath(baseDir, entry.name);
    const parsed = loadMd(fullPath);
    const id = parsed.data.id || base;
    result[id] = {
      id,
      title: parsed.data.title || entry.name,
      order: parsed.data.order ?? 999,
      filename: fullPath,
      content: normalizeImageLinks(parsed.content, lang),
      data: parsed.data,
      lang: parsed.data.lang || null,
      _source: "neutral-root",
    };
  }

  // 2) Root files with .<lang>.md (override neutral)
  for (const entry of collectMarkdownEntries(baseDir)) {
    const { base, lang: suffix } = parseLangFromFilename(entry.name);
    if (!suffix || suffix !== lang) continue;
    const fullPath = fileManager.joinPath(baseDir, entry.name);
    const parsed = loadMd(fullPath);
    const id = parsed.data.id || base;
    result[id] = {
      id,
      title: parsed.data.title || entry.name,
      order: parsed.data.order ?? result[id]?.order ?? 999,
      filename: fullPath,
      content: normalizeImageLinks(parsed.content, lang),
      data: parsed.data,
      lang: parsed.data.lang || suffix,
      _source: "root-suffixed",
    };
  }

  // 1) Files in help/<lang>/ (highest precedence)
  if (fileManager.fileExists(langDir)) {
    const files = collectMarkdownEntries(langDir);
    for (const entry of files) {
      const { base } = parseLangFromFilename(entry.name); // don’t re-parse lang; folder defines it
      const fullPath = fileManager.joinPath(langDir, entry.name);
      const parsed = loadMd(fullPath);
      const id = parsed.data.id || base;
      result[id] = {
        id,
        title: parsed.data.title || entry.name,
        order: parsed.data.order ?? result[id]?.order ?? 999,
        filename: fullPath,
        content: normalizeImageLinks(parsed.content, lang),
        data: parsed.data,
        lang: parsed.data.lang || lang,
        _source: "lang-folder",
      };
    }
  }

  helpCache[lang] = result;
}

function listHelpTopics(lang = "en") {
  ensureLangLoaded(lang);
  return Object.values(helpCache[lang]).sort((a, b) => a.order - b.order);
}

function getHelpTopic(id, lang = "en") {
  ensureLangLoaded(lang);
  if (helpCache[lang][id]) return helpCache[lang][id];
  // Fallback: try neutral index when specific id missing
  if (helpCache[lang]["index"]) return helpCache[lang]["index"];
  // As a last resort, try English cache
  if (lang !== "en") {
    ensureLangLoaded("en");
    return helpCache["en"][id] || helpCache["en"]["index"] || null;
  }
  return null;
}

module.exports = {
  listHelpTopics,
  getHelpTopic,
};
