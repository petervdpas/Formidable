// utils/pathUtils.js

// Convert absolute path into "./relative/path" if it starts with appRoot
export function formatAsRelativePath(selected, appRoot) {
  if (!selected || !appRoot) return selected;

  return selected.startsWith(appRoot)
    ? "./" +
        selected
          .slice(appRoot.length)
          .replace(/^[\\/]/, "")
          .replace(/\\/g, "/")
    : selected;
}

// YAML-specific
export function stripYamlExtension(name = "") {
  return name.replace(/\.yaml$/i, "");
}

export function addYamlExtension(name = "") {
  return name.endsWith(".yaml") ? name : `${name}.yaml`;
}

// Metadata-specific
export function stripMetaExtension(filename = "") {
  return filename.replace(/\.meta\.json$/i, "");
}

export function addMetaExtension(filename = "") {
  return filename.endsWith(".meta.json") ? filename : `${filename}.meta.json`;
}
