(function () {
  const el = document.getElementById('crumbs');
  if (!el) return;

  const meta = window.__FORMIDABLE__ || {};
  const esc = s => String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  // Start with the root crumb: "Formidable"
  const items = [{ href: '/', label: 'Formidable', cls: 'root' }];

  // Then template and (optional) form
  if (meta.templateId) {
    items.push({
      href: `/template/${encodeURIComponent(meta.templateId)}`,
      label: meta.templateName || meta.templateId
    });
  } else {
    const m = location.pathname.match(/^\/template\/([^/]+)/i);
    if (m) items.push({
      href: `/template/${encodeURIComponent(m[1])}`,
      label: decodeURIComponent(m[1])
    });
  }

  if (meta.formFile) {
    items.push({ href: null, label: meta.formTitle || meta.formFile });
  } else {
    const f = location.pathname.match(/^\/template\/[^/]+\/form\/([^/]+)/i);
    if (f) items.push({ href: null, label: decodeURIComponent(f[1]) });
  }

  // Render
  el.innerHTML = items.map((p, i) =>
    (i ? '<span class="sep">/</span>' : '') +
    (p.href
      ? `<a ${p.cls ? `class="${p.cls}"` : ''} href="${p.href}">${esc(p.label)}</a>`
      : `<span class="current">${esc(p.label)}</span>`)
  ).join('');

  // '/' focuses the search only if search is enabled
  const q = document.getElementById('q');
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && q && !q.disabled && document.activeElement !== q) {
      e.preventDefault();
      q.focus();
    }
  });
})();