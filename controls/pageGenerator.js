// controls/pageGenerator.js

const Handlebars = require("handlebars");

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
    ul {
      list-style: disc;
      margin: 1em 0;
      padding-left: 2em;
    }
    ul ul {
      list-style: circle;
    }
    ul li {
      margin-bottom: 0.5em;
    }
    ol {
      list-style: decimal;
      margin: 1em 0;
      padding-left: 2em;
    }
    ol li {
      margin-bottom: 0.5em;
    }
    ol ol {
      list-style: lower-alpha;
      margin-top: 0.5em;
    }
      
    /* Remove bullet dots and reset padding for both lists */
    ul.template-list,
    ul.form-picker-list {
      list-style: none;
      padding-left: 0;
      margin: 1em 0;
    }

    /* Common item styling */
    ul.template-list li.template-item,
    ul.form-picker-list li.form-picker-item {
      margin-bottom: 0.3em;
    }

    /* Make each link fill the row */
    ul.template-list a,
    ul.form-picker-list a {
      display: block;
      padding: 0.4em 0.6em;
      border-radius: 4px;
      text-decoration: none;
      color: #333;
      background-color: #f7f7f7;
      border: 1px solid #ddd;
      transition: background-color 0.2s, border-color 0.2s;
    }

    /* Hover/active effect */
    ul.template-list a:hover,
    ul.form-picker-list a:hover {
      background-color: #e8f0ff;
      border-color: #4a90e2;
      color: #4a90e2;
    }

    /* Selected state example */
    ul.template-list a.selected,
    ul.form-picker-list a.selected {
      background-color: #dce6f9;
      border-color: #4a90e2;
      font-weight: 600;
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
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1.5em auto;
    }
    a.wiki-link {
      color: #6a2fb8;
      font-weight: 600;
      border-bottom: 1px dashed #aaa;
    }
    a.wiki-link:hover {
      color: #4a90e2;
      background: #f2f2ff;
    }
    .inline-tag {
      display: inline-block;
      background-color: #3d5a3d;
      color: #f0fff0;
      border: 1px solid #81c784;
      padding: 2px 6px;
      margin: 0 4px 2px 0;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 500;
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
