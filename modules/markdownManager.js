// modules/markdownManager.js

const { SingleFileRepository } = require("./sfr");

const markdownRepo = new SingleFileRepository({
  defaultExtension: ".md",
  defaultJson: false,
  silent: false,
});

function generateMarkdown(data) {
  let md = "";
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "boolean") {
      md += `- [${value ? "x" : " "}] ${key}\n`;
    } else {
      md += `**${key}:** ${value}\n\n`;
    }
  }
  return md;
}

function saveMarkdown(directory, filename, dataObject) {
  const fullPath = markdownRepo.getStoragePath(directory, filename, { extension: ".md" });
  return markdownRepo.saveFile(fullPath, dataObject, {
    transform: generateMarkdown,
  });
}

function loadMarkdown(directory, filename) {
  const fullPath = markdownRepo.getStoragePath(directory, filename, { extension: ".md" });
  return markdownRepo.loadFile(fullPath);
}

module.exports = {
  saveMarkdown,
  loadMarkdown,
};