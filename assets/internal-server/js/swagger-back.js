(function () {
  function ensureLink() {
    var a = document.querySelector(".fm-docs-back");
    if (a) return a;
    a = document.createElement("a");
    a.href = "/";
    a.className = "fm-docs-back";
    a.textContent = "← Back to Formidable Wiki";
    a.setAttribute("aria-label", "Back to Wiki");
    document.body.appendChild(a);
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") location.href = "/";
    });
    return a;
  }

  function moveIntoTopbar(a) {
    var topbar = document.querySelector(".swagger-ui .topbar .wrapper");
    if (!topbar) return false;
    if (!a.classList.contains("in-topbar")) {
      a.classList.add("in-topbar");
      topbar.appendChild(a);
    }
    return true;
  }

  function mount() {
    var a = ensureLink();
    if (moveIntoTopbar(a)) return;

    var obs = new MutationObserver(function () {
      if (moveIntoTopbar(a)) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", mount)
    : mount();
})();
