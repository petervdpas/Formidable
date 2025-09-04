// controls/pageGenerator.js

const Handlebars = require("handlebars");

function compilePageTemplate() {
  const templateSrc = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="/assets/formidable.ico" type="image/x-icon" />
  <title>{{title}}</title>
  <link rel="stylesheet" href="/assets/internal-server.css" />
  <link rel="stylesheet" href="/assets/hljs/github.min.css" />
  <style>
    /* A) Inline code chips (only when NOT inside a <pre>) */
    :not(pre) > code {
      background: #eee;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: Consolas, ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.95em;
    }

    /* B) Plain <pre> blocks (no HLJS markup) */
    pre:not(.hljs) {
      background: #eee;
      padding: 1em;
      border-radius: 4px;
      overflow-x: auto;
    }

    /* C) highlight.js blocks */
    .hljs {                       /* neutralize theme's white background */
      background: transparent;
    }
    pre.hljs {
      background: #f6f8fa;        /* your desired tile color */
      border-radius: 6px;
      padding: 1em;
      overflow-x: auto;
    }
    pre.hljs code {
      background: transparent;    /* no chip background on code inside the block */
      padding: 0;
    }
  </style>
</head>
<body>
  <h1>{{title}}</h1>
  {{{body}}}
  <footer>Formidable Internal Server &mdash; {{footerNote}}</footer>
</body>
</html>
  `;

  return Handlebars.compile(templateSrc);
}

const templateFn = compilePageTemplate();

function renderPage({ title, body = "", footerNote = "" }) {
  return templateFn({ title, body, footerNote });
}

module.exports = { renderPage };
