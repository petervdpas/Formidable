// utils/formContextUtils.js

let _current = null;
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

export const FormContext = {
  /** Set/refresh the current snapshot (call from load/save handlers). */
  setCurrent({
    meta = null,
    data = {},
    template = null,
    filename = null,
  } = {}) {
    _current = { meta: clone(meta), data: clone(data), template, filename };
  },

  /** Clear snapshot (e.g., after delete or when nothing selected). */
  clear() {
    _current = null;
  },

  /** Return a deep copy of the snapshot (safe for user code). */
  snapshot() {
    return clone(_current);
  },
};
