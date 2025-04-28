// modules/metaManager.js

const { SingleFileRepository } = require("./sfr");

const metaRepo = new SingleFileRepository({
  defaultExtension: ".meta.json",
  defaultJson: true,
  silent: false,
});

function saveMeta(directory, markdownFilename, data) {
  return metaRepo.saveMetadata(directory, markdownFilename, data);
}

function loadMeta(directory, markdownFilename) {
  return metaRepo.loadMetadata(directory, markdownFilename);
}

module.exports = {
  saveMeta,
  loadMeta,
};
