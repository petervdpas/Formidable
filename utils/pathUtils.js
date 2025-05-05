// utils/pathUtils.js

export function formatAsRelativePath(selected, appRoot) {
  return selected.startsWith(appRoot)
    ? "./" +
        selected
          .slice(appRoot.length)
          .replace(/^[\\/]/, "")
          .replace(/\\/g, "/")
    : selected;
}

export function stripYamlExtension(name) {
  return name.replace(/\.yaml$/, "");
}

export function addYamlExtension(name) {
  return name.endsWith(".yaml") ? name : `${name}.yaml`;
}

export function stripMetaExtension(filename) {
  return filename.replace(/\.meta\.json$/, "");
}

export function addMetaExtension(filename) {
  return filename.endsWith(".meta.json") ? filename : `${filename}.meta.json`;
}
