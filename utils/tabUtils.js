// utils/tabUtils.js

/**
 * Create a tab descriptor for createTabView.
 * Accepts both (id, label, buildFn, i18nKey) and (id, label, i18nKey, buildFn).
 *
 * @param {string} id
 * @param {string} label
 * @param {(el:HTMLElement)=>void|string} buildOrKey
 * @param {(el:HTMLElement)=>void|string|null} keyOrBuild
 * @returns {{id:string,label:string,i18nKey:string|null,content:()=>HTMLElement}}
 */
export function makeTab(id, label, buildOrKey, keyOrBuild = null) {
  // Allow swapped arg order
  let build = typeof buildOrKey === "function" ? buildOrKey : keyOrBuild;
  let i18nKey =
    typeof buildOrKey === "string" && typeof keyOrBuild !== "string"
      ? buildOrKey
      : (typeof keyOrBuild === "string" ? keyOrBuild : null);

  if (typeof build !== "function") {
    throw new TypeError(
      `makeTab("${id}"): third or fourth argument must be a function (build(panel)).`
    );
  }

  return {
    id,
    label,
    i18nKey,
    content: () => {
      const el = document.createElement("div");
      el.className = `tab-${id}`;
      build(el);
      return el;
    },
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
 * @param {{t:(key:string)=>string,eventName?:string}|null} [opts.i18n=null]  // if provided, enables live relabel
 * @returns {{root:HTMLElement, select:(i:number)=>void, buttons:HTMLElement[], panels:HTMLElement[], retitle:()=>void}}
 */
export function createTabView({
  items,
  vertical = false,
  activeIndex = 0,
  onChange = null,
  classes = "",
  i18n = null,
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
  const i18nKeys = [];

  const makePanel = (i) => {
    const child = items[i].content();

    // Reuse if caller already provided a .tab-panel
    if (child.classList?.contains("tab-panel")) {
      child.setAttribute("role", "tabpanel");
      child.setAttribute("tabindex", "0");
      child.hidden = true;
      return child;
    }

    // Otherwise, wrap into our own panel
    const p = document.createElement("div");
    p.className = "tab-panel";
    p.setAttribute("role", "tabpanel");
    p.setAttribute("tabindex", "0");
    p.hidden = true;
    p.appendChild(child);
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
    if (it.i18nKey) {
      btn.dataset.i18n = it.i18nKey;
      i18nKeys[i] = it.i18nKey;
    } else {
      i18nKeys[i] = null;
    }
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

  // i18n relabel support
  function retitle() {
    if (!i18n?.t) return;
    for (let i = 0; i < buttons.length; i++) {
      const k = i18nKeys[i];
      if (k) buttons[i].textContent = i18n.t(k);
    }
  }

  let langHandler = null;
  if (i18n?.t) {
    const ev = i18n.eventName || "i18n:changed";
    langHandler = () => retitle();
    document.addEventListener(ev, langHandler);

    // auto-unsubscribe when root is removed from DOM
    const mo = new MutationObserver(() => {
      if (!root.isConnected) {
        document.removeEventListener(ev, langHandler);
        mo.disconnect();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

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

  return { root, select, buttons, panels, retitle };
}

// Toggle orientation after createTabView has been created
export function setTabviewOrientation(tabviewOrRoot, vertical) {
  const root = tabviewOrRoot?.root || tabviewOrRoot;
  if (!root) return;

  root.classList.toggle("vtabs", !!vertical);
  root.classList.toggle("htabs", !vertical);

  const list = root.querySelector('.tab-buttons[role="tablist"]');
  if (list) {
    list.setAttribute("aria-orientation", vertical ? "vertical" : "horizontal");
  }
}
