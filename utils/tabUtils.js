// utils/tabUtils.js

/**
 * Initializes a tabbed interface with optional per-tab callbacks.
 *
 * @param {string} containerSelector - Selector for the tab container
 * @param {string} tabButtonSelector - Selector for tab buttons inside the container
 * @param {string} tabContentSelector - Selector for tab content panels inside the container
 * @param {object} [options] - Optional config:
 *   - activeClass: CSS class to apply to active tab and panel
 *   - onTabChange: function(index) — optional callback per tab
 */
export function initTabs(containerSelector, tabButtonSelector, tabContentSelector, options = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) return false;

  const buttons = container.querySelectorAll(tabButtonSelector);
  const panels = container.querySelectorAll(tabContentSelector);
  const activeClass = options.activeClass || "active";
  const onTabChange = options.onTabChange || (() => {});

  if (!buttons.length || !panels.length) return false;

  buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove(activeClass));
      panels.forEach((p) => p.classList.remove(activeClass));

      btn.classList.add(activeClass);
      panels[i].classList.add(activeClass);

      onTabChange(i);
    });
  });

  // Optional: activate first tab
  buttons[0]?.classList.add(activeClass);
  panels[0]?.classList.add(activeClass);
  onTabChange(0);

  return true;
}
