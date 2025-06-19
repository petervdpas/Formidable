// controls/pageGenerator.js

const Handlebars = require('handlebars');

function compilePageTemplate() {
  const templateSrc = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{{title}}</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #f9f9f9;
      color: #333;
      padding: 2rem;
      max-width: 960px;
      margin: 2rem auto;
      line-height: 1.6;
    }
    h1 {
      color: #4a90e2;
      margin-top: 0;
    }
    h2, h3, h4 {
      color: #333;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    p {
      margin-bottom: 1em;
    }
    a {
      color: #4a90e2;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    ul, ol {
      margin: 1em 0;
      padding-left: 1.5em;
    }
    li {
      margin-bottom: 0.4em;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    table th,
    table td {
      border: 1px solid #ccc;
      padding: 8px 12px;
      text-align: left;
    }
    table th {
      background-color: #f0f0f0;
    }
    code {
      background: #eee;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: Consolas, monospace;
      font-size: 0.95em;
    }
    pre {
      background: #eee;
      padding: 1em;
      border-radius: 4px;
      overflow-x: auto;
    }
    footer {
      margin-top: 3rem;
      font-size: 0.85rem;
      color: #aaa;
      text-align: center;
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

function renderPage({ title, body = '', footerNote = '' }) {
  return templateFn({ title, body, footerNote });
}

module.exports = { renderPage };
