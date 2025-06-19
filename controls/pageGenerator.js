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
      list-style: none;
      margin: 1em 0;
      padding-left: 0;
    }
    ul li {
      margin: 0.4em 0;
      padding: 0.4em 0.6em;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 5px;
      transition: background 0.2s, box-shadow 0.2s;
    }
    ul li:hover {
      background: #f0f8ff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    ul li a {
      display: block;
      color: #4a90e2;
      text-decoration: none;
      font-weight: 500;
    }
    ul li a:hover {
      text-decoration: underline;
    }
    ol {
      margin: 1em 0;
      padding-left: 1.5em;
      counter-reset: item;
    }
    ol li {
      margin: 0.4em 0;
      padding: 0.4em 0.6em 0.4em 2em;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 5px;
      position: relative;
      transition: background 0.2s, box-shadow 0.2s;
    }
    ol li::before {
      content: counter(item) ".";
      counter-increment: item;
      position: absolute;
      left: 0.8em;
      top: 50%;
      transform: translateY(-50%);
      color: #4a90e2;
      font-weight: bold;
    }
    ol li:hover {
      background: #f0f8ff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    ol li a {
      display: inline-block;
      color: #4a90e2;
      text-decoration: none;
      font-weight: 500;
    }
    ol li a:hover {
      text-decoration: underline;
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

function renderPage({ title, body = "", footerNote = "" }) {
  return templateFn({ title, body, footerNote });
}

module.exports = { renderPage };
