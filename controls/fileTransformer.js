// controls/fileTransformer.js

const { log, warn } = require("./nodeLogger.js"); // Node context

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

    const h1 = line.match(/^# (.+)/);
    if (h1) {
      result["title"] = h1[1].trim(); // crude but common
    }
  }

  log("[FileTransformer] Parsed markdown into fields:", result);
  return result;
}

function generateMarkdownFromFields(fields, templateFields = []) {
  let md = "";

  for (const field of templateFields) {
    const key = field.key;
    const value = fields[key];
    const label = field.label || key;
    const tag = (field.markdown || "p").toLowerCase();

    if (tag === "h1") {
      md += `# ${value}\n\n`;
    } else if (tag === "h2") {
      md += `## ${value}\n\n`;
    } else if (tag === "checkbox") {
      md += `- [${value ? "x" : " "}] ${label}\n`;
    } else if (tag === "list" && Array.isArray(value)) {
      for (const item of value) {
        md += `- ${item}\n`;
      }
      md += "\n";
    } else {
      // default: bold label + value
      md += `**${label}:** ${value}\n\n`;
    }
  }

  log("[FileTransformer] Generated markdown from fields.");
  return md;
}

module.exports = {
  parseMarkdownToFields,
  generateMarkdownFromFields,
};
