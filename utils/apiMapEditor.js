// utils/apiMapEditor.js

// ── helpers (module scope)
function _normalizeApiMap(arr = []) {
  const out = [];
  const seen = new Set();
  for (const it of arr || []) {
    if (!it || typeof it !== "object") continue;
    const key = String(it.key || "").trim();
    if (!key || seen.has(key)) continue;
    const path = String(it.path || key).trim();
    const modeRaw = String(it.mode || "static").toLowerCase();
    let mode = "static";
    if (modeRaw === "editable") mode = "editable";
    else if (modeRaw === "live-fill") mode = "live-fill";
    else if (modeRaw === "live-edit") mode = "live-edit";
    out.push({ key, path, mode });
    seen.add(key);
  }
  return out;
}

function _parseApiMapFromTextarea(s) {
  const t = String(s || "").trim();
  if (!t) return [];
  try { return _normalizeApiMap(JSON.parse(t)); } catch {}
  try {
    let x = t.replace(/'/g, '"');
    x = x.replace(/([{,\s])([A-Za-z_]\w*)\s*:/g, '$1"$2":');
    x = x.replace(/,\s*([}\]])/g, "$1");
    return _normalizeApiMap(JSON.parse(x));
  } catch { return []; }
}

export function setupApiMapEditor({ dom, initialMap = [], onDirty }) {
  const { textarea, containerRow } = dom || {};
  if (!textarea || !containerRow) return null;

  // remove any previous widget and hide the textarea
  containerRow.querySelector(".api-map-editor")?.remove();
  textarea.style.display = "none";

  const editor = createApiMapEditor(containerRow, (rows) => {
    const norm = _normalizeApiMap(rows);
    textarea.value = JSON.stringify(norm, null, 0);
    onDirty?.(norm);
  });

  const seed = (Array.isArray(initialMap) && initialMap.length)
    ? _normalizeApiMap(initialMap)
    : _parseApiMapFromTextarea(textarea.value);

  editor.setValues(seed);
  textarea.value = JSON.stringify(_normalizeApiMap(editor.getValues()), null, 0);

  return editor;
}

// ─────────────────────────────────────────────────────────────

function createApiMapEditor(container, onChange) {
  // wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "api-map-editor";

  // header
  const head = document.createElement("div");
  head.className = "api-map-head";
  head.innerHTML = `
    <div class="col-key">Key</div>
    <div class="col-path">Path</div>
    <div class="col-mode">Mode</div>
    <div class="col-actions"></div>
  `;

  // rows container
  const list = document.createElement("div");
  list.className = "api-map-list";

  // add (+) button
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.textContent = "+";
  addBtn.className = "api-map-add";
  addBtn.setAttribute("aria-label", "Add map row");
  addBtn.title = "Add map row";
  addBtn.onclick = () => addRow();

  wrapper.append(head, list, addBtn);
  container.appendChild(wrapper);

  function addRow({ key = "", path = "", mode = "static" } = {}) {
    const row = document.createElement("div");
    row.className = "api-map-row";

    // Key
    const keyWrap = document.createElement("div");
    keyWrap.className = "col-key";
    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.placeholder = "key";
    keyInput.value = key;
    keyWrap.appendChild(keyInput);

    // Path
    const pathWrap = document.createElement("div");
    pathWrap.className = "col-path";
    const pathInput = document.createElement("input");
    pathInput.type = "text";
    pathInput.placeholder = "path";
    pathInput.value = path || key;
    pathWrap.appendChild(pathInput);

    // Mode
    const modeWrap = document.createElement("div");
    modeWrap.className = "col-mode";
    const modeSelect = document.createElement("select");
    ["static", "editable", "live-fill", "live-edit"].forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m; opt.textContent = m;
      modeSelect.appendChild(opt);
    });
    modeSelect.value = mode;
    modeWrap.appendChild(modeSelect);

    // Actions
    const actWrap = document.createElement("div");
    actWrap.className = "col-actions";
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "−";
    removeBtn.className = "api-map-remove";
    removeBtn.setAttribute("aria-label", "Remove row");
    removeBtn.title = "Remove row";
    removeBtn.onclick = () => { row.remove(); emitChange(); };
    actWrap.appendChild(removeBtn);

    row.append(keyWrap, pathWrap, modeWrap, actWrap);
    list.appendChild(row);

    keyInput.addEventListener("input", emitChange);
    pathInput.addEventListener("input", emitChange);
    modeSelect.addEventListener("change", emitChange);
  }

  function emitChange() { onChange?.(getValues()); }

  function getValues() {
    const rows = [...list.querySelectorAll(".api-map-row")];
    const vals = rows.map((r) => {
      const key  = r.querySelector(".col-key input")?.value?.trim()  || "";
      const path = r.querySelector(".col-path input")?.value?.trim() || "";
      const modeSelect = r.querySelector(".col-mode select")?.value || "static";
      let mode = "static";
      if (modeSelect === "editable") mode = "editable";
      else if (modeSelect === "live-fill") mode = "live-fill";
      else if (modeSelect === "live-edit") mode = "live-edit";
      return key ? { key, path: path || key, mode } : null;
    }).filter(Boolean);
    return _normalizeApiMap(vals);
  }

  function setValues(arr) {
    list.innerHTML = "";
    (arr || []).forEach((x) => addRow(x));
    emitChange();
  }

  function destroy() { wrapper.remove(); }

  return { setValues, getValues, destroy };
}
