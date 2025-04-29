// modules/metaManager.js

const { SingleFileRepository } = require("./sfr");

const metaRepo = new SingleFileRepository({
  defaultExtension: ".meta.json",
  defaultJson: true,
  silent: false,
});

function saveMeta(directory, filename, data) {
  return metaRepo.saveFromBase(directory, filename, data);
}

function loadMeta(directory, filename) {
  return metaRepo.loadFromBase(directory, filename);
}

module.exports = {
  saveMeta,
  loadMeta,
};
