// controls/htmlRenderer.js

const { joinPath } = require("./fileManager");
const { log, error } = require("./nodeLogger");
const MarkdownIt = require("markdown-it");
const sanitizeHtml = require("sanitize-html");

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

// 🧩 Patch image rule to support file:// URLs
const defaultImageRenderer =
  md.renderer.rules.image ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.image = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const src = token.attrGet("src");

  if (src && src.startsWith("file://")) {
    token.attrSet("src", src); // Explicitly preserve file:// src
  }

  return defaultImageRenderer(tokens, idx, options, env, self);
};

const frontmatterRegex = /^---\n[\s\S]+?\n---\n*/;

function stripFrontmatter(markdown) {
  return markdown.replace(frontmatterRegex, "");
}

function convertFileImages(markdown) {
  // Convert ![alt](file://...) to <img>
  markdown = markdown.replace(/!\[([^\]]*)\]\((file:\/\/[^\)]+)\)/g, (_, alt, src) => {
    return `<img src="${src}" alt="${alt}">`;
  });

  // Convert ![alt](images/...) to absolute file:// URL
  markdown = markdown.replace(/!\[([^\]]*)\]\((images\/[^\)]+)\)/g, (_, alt, relPath) => {
    const absPath = joinPath("help", relPath);
    const fileUrl = `file://${absPath.replace(/\\/g, "/")}`;
    return `<img src="${fileUrl}" alt="${alt}">`;
  });

  return markdown;
}

function renderHtml(markdown) {
  try {
    const cleaned = stripFrontmatter(markdown);
    const preprocessed = convertFileImages(cleaned);
    const dirty = md.render(preprocessed);
    const clean = sanitizeHtml(dirty, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedAttributes: {
        img: ["src", "alt", "title"],
        a: ["href", "name", "target"],
      },
      allowedSchemes: ["http", "https", "data", "file"],
    });

    log("[HtmlRenderer] Rendered and sanitized HTML.");
    return clean;
  } catch (err) {
    error("[HtmlRenderer] Failed to render HTML:", err);
    return `<pre style="color:red">Render error: ${err.message}</pre>`;
  }
}

module.exports = { renderHtml };
