// controls/htmlRenderer.js

const { joinPath } = require("./fileManager");
const { log, error } = require("./nodeLogger");
const MarkdownIt = require("markdown-it");
const sanitizeHtml = require("sanitize-html");
const hljs = require("highlight.js");

// ── Code block language aliases ───────────────────────────
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

// ── Small helpers ─────────────────────────────────────────
function toFileUrl(absPath) {
  return `file://${String(absPath).replace(/\\/g, "/")}`;
}
function isWinAbs(p) {
  return /^[a-z]:[\\/]/i.test(p);
}
function isUnixAbs(p) {
  return p?.startsWith("/") || p?.startsWith("\\");
}

// ── MarkdownIt with highlight.js ──────────────────────────
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    const norm = (lang || "").toLowerCase();
    const mapped = LANG_ALIASES[norm] || norm;

    if (mapped && hljs.getLanguage(mapped)) {
      try {
        const html = hljs.highlight(str, {
          language: mapped,
          ignoreIllegals: true,
        }).value;
        return `<pre class="hljs"><code class="language-${mapped}">${html}</code></pre>`;
      } catch {}
    }
    const esc = md.utils.escapeHtml(str);
    return `<pre class="hljs"><code>${esc}</code></pre>`;
  },
});

// ── <a> normalization + hardening ─────────────────────────
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  function (tokens, idx, opts, env, self) {
    return self.renderToken(tokens, idx, opts);
  };

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const t = tokens[idx];
  const href = t.attrGet("href");

  if (href) {
    if (/^images\//i.test(href)) {
      // Relative help asset
      const abs = joinPath("help", href);
      t.attrSet("href", toFileUrl(abs));
    } else if (href.startsWith("file://")) {
      // Keep as-is
      t.attrSet("href", href);
    } else if (isWinAbs(href) || isUnixAbs(href)) {
      // Absolute filesystem path -> file://
      t.attrSet("href", toFileUrl(href));
    }
  }

  // Always open in new tab/window and harden
  t.attrSet("target", "_blank");
  t.attrSet("rel", "noopener noreferrer");

  return defaultLinkOpen(tokens, idx, options, env, self);
};

// ── <img> normalization ───────────────────────────────────
const defaultImageRenderer =
  md.renderer.rules.image ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.image = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const src = token.attrGet("src");

  if (src) {
    if (src.startsWith("file://")) {
      token.attrSet("src", src);
    } else if (/^images\//i.test(src)) {
      const abs = joinPath("help", src);
      token.attrSet("src", toFileUrl(abs));
    } else if (isWinAbs(src) || isUnixAbs(src)) {
      token.attrSet("src", toFileUrl(src));
    }
  }
  return defaultImageRenderer(tokens, idx, options, env, self);
};

// ── Helpers ───────────────────────────────────────────────
const frontmatterRegex = /^---\n[\s\S]+?\n---\n*/;

function stripFrontmatter(markdown) {
  return markdown.replace(frontmatterRegex, "");
}

// Convert image markdown that already uses file:// or images/...,
// so it renders even if markdown-it or sanitizer would rewrite.
function convertFileImages(markdown) {
  // ![alt](file://...)
  markdown = markdown.replace(
    /!\[([^\]]*)\]\((file:\/\/[^\)]+)\)/g,
    (_, alt, src) => `<img src="${src}" alt="${alt}">`
  );

  // ![alt](images/...)
  markdown = markdown.replace(
    /!\[([^\]]*)\]\((images\/[^\)]+)\)/g,
    (_, alt, relPath) => {
      const abs = joinPath("help", relPath);
      return `<img src="${toFileUrl(abs)}" alt="${alt}">`;
    }
  );

  return markdown;
}

// Decorate hashtags outside of <pre>/<code> blocks
function decorateTagsOutsideCode(html) {
  return html
    .split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/gi)
    .map((seg) => {
      if (/^<pre/i.test(seg) || /^<code/i.test(seg)) return seg;
      return seg.replace(
        /(^|\s)(#[\w.\-]+)/g,
        (_, pre, tag) => `${pre}<span class="inline-tag">${tag}</span>`
      );
    })
    .join("");
}

// ── Render pipeline ───────────────────────────────────────
function renderHtml(markdown) {
  try {
    const cleaned = stripFrontmatter(markdown);
    const preprocessed = convertFileImages(cleaned);
    const dirty = md.render(preprocessed);
    const tagDecorated = decorateTagsOutsideCode(dirty);

    const clean = sanitizeHtml(tagDecorated, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "img",
        "span",
        "pre",
        "code",
      ]),
      allowedAttributes: {
        img: ["src", "alt", "title"],
        a: ["href", "name", "target", "rel"],
        span: ["class"],
        pre: ["class"],
        code: ["class"],
      },
      allowedClasses: {
        span: ["inline-tag", /^hljs(?:-[\w-]+)?$/],
        pre: ["hljs"],
        code: ["hljs", "language-*"],
      },
      // Keep local files/images and common link schemes
      allowedSchemes: ["http", "https", "data", "file", "mailto", "tel"],
    });

    log("[HtmlRenderer] Rendered and sanitized HTML.");
    return clean;
  } catch (err) {
    error("[HtmlRenderer] Failed to render HTML:", err);
    return `<pre style="color:red">Render error: ${err.message}</pre>`;
  }
}

module.exports = { renderHtml };
