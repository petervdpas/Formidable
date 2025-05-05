// modules/pathUtils.js

export function formatAsRelativePath(selected, appRoot) {
  return selected.startsWith(appRoot)
    ? "./" +
        selected
          .slice(appRoot.length)
          .replace(/^[\\/]/, "")
          .replace(/\\/g, "/")
    : selected;
}

export function stripMetaExtension(filename) {
  return filename.replace(/\.meta\.json$/, "");
}
