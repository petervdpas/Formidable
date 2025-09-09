// utils/pathUtils.js

/**
 * Convert absolute path into "./relative/path" if it starts with appRoot.
 */
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

/**
 * Strip trailing .yaml extension (case-insensitive).
 */
export function stripYamlExtension(name = "") {
  return name.replace(/\.yaml$/i, "");
}

/**
 * Add .yaml extension if missing.
 */
export function addYamlExtension(name = "") {
  return name.endsWith(".yaml") ? name : `${name}.yaml`;
}

/**
 * Strip trailing .meta.json extension (case-insensitive).
 */
export function stripMetaExtension(filename = "") {
  return filename.replace(/\.meta\.json$/i, "");
}

/**
 * Add .meta.json extension if missing.
 */
export function addMetaExtension(filename = "") {
  return filename.endsWith(".meta.json") ? filename : `${filename}.meta.json`;
}

/**
 * Normalize path to always use forward slashes.
 */
export function normalizeSlashes(path = "") {
  return path.replace(/\\/g, "/");
}

/**
 * Return filename from path (without directories).
 */
export function getFilename(path = "") {
  return normalizeSlashes(path).split("/").pop() || "";
}

/**
 * Return directory part of path (without filename).
 */
export function getDirname(path = "") {
  const parts = normalizeSlashes(path).split("/");
  parts.pop();
  return parts.join("/") || ".";
}

/**
 * Remove extension from filename.
 */
export function stripExtension(filename = "") {
  return filename.replace(/\.[^/.]+$/, "");
}

/**
 * Return extension (without dot) or empty string.
 */
export function getExtension(filename = "") {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Join path segments safely using forward slashes.
 */
export function joinPaths(...parts) {
  return parts
    .filter(Boolean)
    .map((p) => normalizeSlashes(p).replace(/^\/+|\/+$/g, ""))
    .join("/")
    .replace(/\/{2,}/g, "/");
}

/**
 * Check if path is relative (starts with ./ or ../).
 */
export function isRelative(path = "") {
  return /^(\.\/|\.\.\/)/.test(path);
}

/**
 * Ensure path starts with "./" (template-relative refs).
 */
export function ensureRelative(path = "") {
  if (!path) return "./";
  return isRelative(path) ? path : `./${normalizeSlashes(path)}`;
}

/**
 * Ensure path is absolute relative to base (if not already absolute).
 */
export function ensureAbsolute(path = "", base = "") {
  if (!path) return "";
  const norm = normalizeSlashes(path);
  if (/^(\/|[a-zA-Z]:[\\/])/.test(norm)) return norm; // already absolute
  return joinPaths(base, norm);
}

/**
 * Return path relative to baseDir, if possible.
 */
export function makeRelativeTo(path = "", baseDir = "") {
  const normPath = normalizeSlashes(path);
  const normBase = normalizeSlashes(baseDir);
  if (!normPath.startsWith(normBase)) return normPath;
  return normPath.slice(normBase.length).replace(/^\/+/, "") || ".";
}

/**
 * Return absolute path, using baseDir if given relative.
 */
export function makeAbsoluteTo(path = "", baseDir = "") {
  return ensureAbsolute(path, baseDir);
}

/**
 * Return longest common prefix among multiple paths.
 */
export function commonPathPrefix(...paths) {
  if (!paths.length) return "";
  const splitPaths = paths.map((p) => normalizeSlashes(p).split("/"));
  const minLen = Math.min(...splitPaths.map((parts) => parts.length));
  let prefix = [];

  for (let i = 0; i < minLen; i++) {
    const seg = splitPaths[0][i];
    if (splitPaths.every((parts) => parts[i] === seg)) {
      prefix.push(seg);
    } else {
      break;
    }
  }
  return prefix.join("/");
}

/**
 * Check if child path is inside parent directory.
 */
export function isSubPath(child = "", parent = "") {
  const normChild = normalizeSlashes(child);
  const normParent = normalizeSlashes(parent).replace(/\/+$/, "");
  return normChild.startsWith(normParent + "/") || normChild === normParent;
}

/**
 * Return relative path from one directory to another.
 */
export function relativeFrom(from = "", to = "") {
  const fromParts = normalizeSlashes(from).split("/").filter(Boolean);
  const toParts = normalizeSlashes(to).split("/").filter(Boolean);

  // Find common prefix length
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++;
  }

  const up = fromParts.slice(i).map(() => "..");
  const down = toParts.slice(i);
  return [...up, ...down].join("/") || ".";
}
