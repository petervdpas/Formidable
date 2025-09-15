// Enable search only when there are tags to search.
(function () {
  const q = document.getElementById('q');
  if (!q) return;

  // Form tiles (list pages) carry data-tags=""
  const items = Array.from(document.querySelectorAll('.form-picker-list [data-tags]'));

  // Do we have at least one non-empty tag string?
  const hasTags = items.some(li => (li.getAttribute('data-tags') || '').trim().length > 0);

  if (!hasTags) {
    // Nothing to search – disable input and stop here.
    q.disabled = true;
    q.placeholder = 'No #tags available on this page';
    return;
  }

  // ---- Search is enabled below ----
  q.disabled = false;

  function applyFilter(value) {
    const raw = (value || '').trim().toLowerCase();
    const parts = raw.split(/\s+/).filter(Boolean);

    // Separate #tags from plain terms
    const tagTerms   = parts.filter(p => p.startsWith('#')).map(p => p.slice(1));
    const textTerms  = parts.filter(p => !p.startsWith('#'));

    items.forEach(li => {
      const tags  = (li.getAttribute('data-tags') || '').toLowerCase();
      const title = (li.querySelector('.form-link-title')?.textContent || '').toLowerCase();
      const expr  = (li.querySelector('.expr-wrapper')?.textContent || '').toLowerCase();

      // tag match = every tagTerm must be present
      const tagOk  = tagTerms.every(t => tags.includes(t));
      // text match = every textTerm must appear in title or expr
      const textOk = textTerms.every(t => title.includes(t) || expr.includes(t));

      const show = tagOk && textOk;
      li.classList.toggle('hidden', !show);
    });
  }

  // Live filtering
  q.addEventListener('input', e => applyFilter(e.target.value));

  // Preload any query from URL hash (?q=) if you want (optional)
  // const params = new URLSearchParams(location.search);
  // if (params.has('q')) { q.value = params.get('q'); applyFilter(q.value); }
})();
