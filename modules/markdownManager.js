// modules/markdownManager.js

const { SingleFileRepository } = require("./sfr");
const { generateMarkdownFromFields } = require("./fileTransformer");

const markdownRepo = new SingleFileRepository({
  defaultExtension: ".md",
  defaultJson: false,
  silent: false,
});

function saveMarkdown(directory, filename, data) {
  return markdownRepo.saveFromBase(directory, filename, data, {
    transform: generateMarkdownFromFields,
  });
}

function loadMarkdown(directory, filename) {
  return markdownRepo.loadFromBase(directory, filename);
}

module.exports = {
  saveMarkdown,
  loadMarkdown,
};
