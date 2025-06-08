// utils/vfsUtils.js
import { setValueAtKey } from "./transformationUtils.js";

/**
 * Assigns template.virtualLocation based on legacy storage_location.
 * Intended as an interim step while phasing out storage_location.
 *
 * @param {Object} template
 * @returns {Object} The same template object with virtualLocation set.
 */
export function ensureVirtualLocation(template) {
  return setValueAtKey(
    template,
    "virtualLocation",
    template?.storage_location || ""
  );
}
