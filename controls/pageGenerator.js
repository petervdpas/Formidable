// controls/pageGenerator.js

const Handlebars = require("handlebars");

function compilePageTemplate() {
  const templateSrc = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Cache-Control" content="no-store" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <link rel="icon" href="/assets/formidable.ico" type="image/x-icon" />
  <title>{{title}}</title>

  <!-- Internal Server styles (modular) -->
  <link rel="stylesheet" href="/assets/internal-server/css/base.css?v={{v}}" />
  <link rel="stylesheet" href="/assets/internal-server/css/header.css?v={{v}}" />
  <link rel="stylesheet" href="/assets/internal-server/css/content.css?v={{v}}" />

  <!-- highlight.js theme (unchanged) -->
  <link rel="stylesheet" href="/assets/hljs/github.min.css" />
</head>
<body>
  <header id="topbar" role="banner">
    <div class="left">
      <button class="nav-btn back" title="Back" aria-label="Back" onclick="history.back()">‹</button>
      <button class="nav-btn fwd"  title="Forward" aria-label="Forward" onclick="history.forward()">›</button>
      <a class="logo" href="/" aria-label="Home"></a>
      <nav id="crumbs" aria-label="Path"></nav>
    </div>

    <div class="right">
      <input id="q" type="search"
             placeholder="Search titles, expressions, and #tags… (press / to focus)"
             aria-label="Search" />
      <span class="kbd">/</span>
    </div>
  </header>

  <div class="page-wrap">
    <h1>{{title}}</h1>
    {{{body}}}
    <footer>Formidable Internal Server &mdash; {{footerNote}}</footer>
  </div>

  <!-- Modular JS -->
  <script src="/assets/internal-server/js/crumbs.js?v={{v}}"></script>
  <script src="/assets/internal-server/js/filter.js?v={{v}}"></script>
</body>
</html>
  `;
  return Handlebars.compile(templateSrc);
}

const templateFn = compilePageTemplate();

// dev -> timestamp (always fresh), prod -> stable version (electron app version or 1)
function renderPage({ title, body = "", footerNote = "" }) {
  const dev = !(process && process.defaultApp === undefined && process.env.NODE_ENV === "production")
              ? (process.env.NODE_ENV !== "production")
              : false;
  const v = dev ? Date.now() : (process.env.APP_VERSION || "1");
  return templateFn({ title, body, footerNote, v });
}

module.exports = { renderPage };
