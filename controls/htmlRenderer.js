// controls/htmlRenderer.js

const { log, error } = require("./nodeLogger");

const MarkdownIt = require("markdown-it");
const sanitizeHtml = require("sanitize-html");

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const frontmatterRegex = /^---\n[\s\S]+?\n---\n*/;

function stripFrontmatter(markdown) {
  return markdown.replace(frontmatterRegex, "");
}

/**
 * Converts markdown string into rendered HTML.
 * @param {string} markdown
 * @returns {string} HTML output
 */
function renderHtml(markdown) {
  try {
    const cleaned = stripFrontmatter(markdown);
    const dirty = md.render(cleaned);
    const clean = sanitizeHtml(dirty, {
      allowedTags: sanitizeHtml.defaults.allowedTags,
      allowedAttributes: false,
    });
    log("[HtmlRenderer] Rendered and sanitized HTML.");
    return clean;
  } catch (err) {
    error("[HtmlRenderer] Failed to render HTML:", err);
    return `<pre style="color:red">Render error: ${err.message}</pre>`;
  }
}

module.exports = { renderHtml };
