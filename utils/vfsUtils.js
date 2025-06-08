// utils/vfsUtils.js
import { setValueAtKey } from "./transformationUtils.js";

/**
 * Assigns template.virtualLocation
 *
 * @param {Object} template
 * @returns {Object} The same template object with virtualLocation set.
 */
export async function ensureVirtualLocation(template) {
  if (!template || typeof template !== "object") {
    return template; // No-op if template is not an object
  }

  const storageLocation = await window.api.config.getTemplateStorageFolder(
    template.filename
  );

  return setValueAtKey(
    template,
    "virtualLocation",
    storageLocation || ""
  );
}
