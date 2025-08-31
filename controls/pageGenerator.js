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

    /* Slightly darker tiles + crisper border */
    ul.template-list a,
    ul.form-picker-list a {
      display: block;
      padding: 0.6em 0.8em;
      border-radius: 6px;
      text-decoration: none;
      color: #333;
      background-color: #eceff3;     /* was #f7f7f7 */
      border: 1px solid #cfd4da;     /* was #ddd   */
      transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
    }

    /* Hover stays blue-tinted but with a bit more contrast */
    ul.template-list a:hover,
    ul.form-picker-list a:hover {
      background-color: #e3ebff;     /* was #e8f0ff */
      border-color: #4a90e2;
      color: #2a5fbf;
      box-shadow: 0 1px 0 rgba(0,0,0,.02);
    }

    /* Selected state a touch darker too */
    ul.template-list a.selected,
    ul.form-picker-list a.selected {
      background-color: #d7e2f7;     /* was #dce6f9 */
      border-color: #4a90e2;
      font-weight: 600;
    }
    
    .form-link-wrapper {
      display: flex;
      flex-direction: column;
    }

    ul.form-picker-list a.form-link {
      display: flex;
      flex-direction: column;
      gap: 0.2em;
    }

    .form-link-title {
      font-weight: 500;
    }

    .expr-wrapper {
      width: 100%;
      font-size: 0.9em;
    }

    /* ─────────────────────────────────────────────
      Expression Wrapper
    ───────────────────────────────────────────── */
    .expr-wrapper {
      display: block;
      width: 100%;
    }

    /* ─────────────────────────────────────────────
      Semantic Colors
    ───────────────────────────────────────────── */
    .expr-text-green   { color: green; }
    .expr-text-blue    { color: blue; }
    .expr-text-red     { color: red; }
    .expr-text-orange  { color: orange; }
    .expr-text-yellow  { color: goldenrod; }

    /* ─────────────────────────────────────────────
      Neutral & Grayscale
    ───────────────────────────────────────────── */
    .expr-text-black      { color: black; }
    .expr-text-white      { color: white; }
    .expr-text-gray       { color: gray; }
    .expr-text-darkgray   { color: #444; }
    .expr-text-lightgray  { color: #ccc; }

    /* ─────────────────────────────────────────────
      Accent / UI Colors
    ───────────────────────────────────────────── */
    .expr-text-purple  { color: purple; }
    .expr-text-pink    { color: hotpink; }
    .expr-text-cyan    { color: cyan; }
    .expr-text-teal    { color: teal; }
    .expr-text-brown   { color: brown; }
    .expr-text-gold    { color: gold; }
    .expr-text-silver  { color: silver; }

    /* ─────────────────────────────────────────────
      Text Styles
    ───────────────────────────────────────────── */
    .expr-bold {
      font-weight: bold;
    }

    .expr-italic {
      font-style: italic;
    }

    .expr-underline {
      text-decoration: underline;
    }

    /* ─────────────────────────────────────────────
      Blinking Animation
    ───────────────────────────────────────────── */
    .expr-blinking {
      animation: blinkingText 1.2s infinite;
    }

    @keyframes blinkingText {
      0%   { opacity: 1; }
      49%  { opacity: 0; }
      100% { opacity: 1; }
    }

    .expr-ticker-container {
      overflow: hidden;
      position: relative;
      max-width: 100%;
    }

    .expr-ticker {
      display: inline-block;
      white-space: nowrap;
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
