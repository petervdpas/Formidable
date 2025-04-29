// modules/markdownManager.js

const { SingleFileRepository } = require("./sfr");
const { generateMarkdownFromFields } = require("./fileTransformer");

const markdownRepo = new SingleFileRepository({
  defaultExtension: ".md",
  defaultJson: false,
  silent: false,
});

function saveMarkdown(directory, filename, dataObject) {
  const fullPath = markdownRepo.getStoragePath(directory, filename, { extension: ".md" });
  return markdownRepo.saveFile(fullPath, dataObject, {
    transform: generateMarkdownFromFields,
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
