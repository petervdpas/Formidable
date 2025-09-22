// utils/tabUtils.js

/**
 * Simple class-toggling tabs (legacy).
 */
export function initTabs(
  containerSelector,
  tabButtonSelector,
  tabContentSelector,
  options = {}
) {
  const container = document.querySelector(containerSelector);
  if (!container) return false;

  const buttons = container.querySelectorAll(tabButtonSelector);
  const panels = container.querySelectorAll(tabContentSelector);
  const activeClass = options.activeClass || "active";
  const onTabChange = options.onTabChange || (() => {});

  if (!buttons.length || !panels.length) return false;

  const select = (i) => {
    buttons.forEach((b, ix) => b.classList.toggle(activeClass, ix === i));
    panels.forEach((p, ix) => p.classList.toggle(activeClass, ix === i));
    onTabChange(i);
  };

  buttons.forEach((btn, i) => btn.addEventListener("click", () => select(i)));

  select(0);
  return true;
}

/**
 * Create a tab descriptor for createTabView
 *
 * @param {string} id - internal id, also used for DOM ids
 * @param {string} label - text (already translated)
 * @param {function(HTMLElement):void} build - callback that fills the panel element
 * @returns {{id:string,label:string,content:()=>HTMLElement}}
 */
export function makeTab(id, label, build) {
  return {
    id,
    label,
    content: () => {
      const panel = document.createElement("div");
      panel.className = `tab-panel tab-${id}`;
      build(panel);
      return panel;
    }
  };
}

/**
 * createTabView — reusable tab view with ARIA + keyboard + vertical option.
 *
 * @param {Object} opts
 * @param {{id?:string,label:string,i18nKey?:string,content:()=>HTMLElement,disabled?:boolean}[]} opts.items
 * @param {boolean} [opts.vertical=false]
 * @param {number} [opts.activeIndex=0]
 * @param {(index:number)=>void} [opts.onChange]
 * @param {string} [opts.classes]
 * @returns {{root:HTMLElement, select:(i:number)=>void, buttons:HTMLElement[], panels:HTMLElement[]}}
 */
export function createTabView({
  items,
  vertical = false,
  activeIndex = 0,
  onChange = null,
  classes = "",
} = {}) {
  if (!Array.isArray(items) || !items.length)
    throw new Error("createTabView: items required");

  // root
  const root = document.createElement("div");
  root.className = `tabview ${vertical ? "vtabs" : "htabs"} ${classes}`.trim();

  // tablist
  const tablist = document.createElement("div");
  tablist.className = "tab-buttons";
  tablist.setAttribute("role", "tablist");
  if (vertical) tablist.setAttribute("aria-orientation", "vertical");

  // content
  const contentHost = document.createElement("div");
  contentHost.className = "tab-content";

  let current = -1;
  const buttons = [];
  const panels = [];

  const makePanel = (i) => {
    const p = document.createElement("div");
    p.className = "tab-panel";
    p.setAttribute("role", "tabpanel");
    p.setAttribute("tabindex", "0");
    p.hidden = true;
    // let caller create/own the subtree:
    p.appendChild(items[i].content());
    return p;
  };

  items.forEach((it, i) => {
    const id = it.id || `tab-${i}`;

    // button
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab-btn";
    btn.id = `${id}-btn`;
    btn.textContent = it.label;
    btn.disabled = !!it.disabled;

    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.setAttribute("aria-controls", `${id}-panel`);

    btn.addEventListener("click", () => select(i));
    btn.addEventListener("keydown", (e) => {
      const prevKey = vertical ? "ArrowUp" : "ArrowLeft";
      const nextKey = vertical ? "ArrowDown" : "ArrowRight";
      if (e.key !== prevKey && e.key !== nextKey) return;

      e.preventDefault();
      const dir = e.key === prevKey ? -1 : 1;
      let j = i;
      do {
        j = (j + dir + items.length) % items.length;
      } while (buttons[j].disabled && j !== i);
      buttons[j].focus();
      select(j);
    });

    buttons.push(btn);
    tablist.appendChild(btn);

    // panel
    const panel = makePanel(i);
    panel.id = `${id}-panel`;
    panel.setAttribute("aria-labelledby", btn.id);
    panels.push(panel);
    contentHost.appendChild(panel);
  });

  root.append(tablist, contentHost);

  function select(i) {
    if (i === current || buttons[i]?.disabled) return;
    if (current >= 0) {
      buttons[current].classList.remove("active");
      buttons[current].setAttribute("aria-selected", "false");
      panels[current].hidden = true;
      panels[current].classList.remove("active");
    }
    current = i;
    buttons[i].classList.add("active");
    buttons[i].setAttribute("aria-selected", "true");
    panels[i].hidden = false;
    panels[i].classList.add("active");
    onChange && onChange(i);
  }

  select(Math.min(Math.max(0, activeIndex), items.length - 1));

  return { root, select, buttons, panels };
}
