// controls/helpManager.js

const fileManager = require("./fileManager");
const matter = require("gray-matter");

const helpCache = Object.create(null);

function getHelpFolder() {
  return fileManager.resolvePath("help");
}

function initHelpCache() {
  const files = fileManager.listDirectoryEntries(getHelpFolder(), { silent: true });

  files
    .filter((entry) => entry.isFile && entry.name.endsWith(".md"))
    .forEach((entry) => {
      const fullPath = fileManager.resolvePath(getHelpFolder(), entry.name);
      const raw = fileManager.loadFile(fullPath, { format: "text", silent: true });
      const parsed = matter(raw);
      const id = parsed.data.id || entry.name.replace(/\.md$/, "");

      helpCache[id] = {
        id,
        title: parsed.data.title || entry.name,
        order: parsed.data.order || 999,
        filename: entry.name,
        content: parsed.content,
        data: parsed.data,
      };
    });
}

function listHelpTopics() {
  return Object.values(helpCache).sort((a, b) => a.order - b.order);
}

function getHelpTopic(id) {
  return helpCache[id] || null;
}

// Auto-initialize
initHelpCache();

module.exports = {
  listHelpTopics,
  getHelpTopic,
};
