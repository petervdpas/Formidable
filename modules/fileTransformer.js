// modules/fileTransformer.js

const { log, warn } = require("./nodeLogger.js"); // <- Node require, not import

function parseMarkdownToFields(markdown) {
  const lines = markdown.split("\n");
  const result = {};

  for (const line of lines) {
    const checkbox = line.match(/- \[(x| )\] (.+)/i);
    if (checkbox) {
      const [, checked, key] = checkbox;
      result[key.trim()] = checked.toLowerCase() === "x";
      continue;
    }

    const textField = line.match(/\*\*(.+):\*\* (.+)/);
    if (textField) {
      const [, key, value] = textField;
      result[key.trim()] = value.trim();
    }
  }

  log("[FileTransformer] Parsed markdown into fields:", result);
  return result;
}

function generateMarkdownFromFields(fields) {
  let md = "";
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "boolean") {
      md += `- [${value ? "x" : " "}] ${key}\n`;
    } else {
      md += `**${key}:** ${value}\n\n`;
    }
  }
  log("[FileTransformer] Generated markdown from fields.");
  return md;
}

module.exports = {
  parseMarkdownToFields,
  generateMarkdownFromFields,
};
