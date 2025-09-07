// utils/codeRunner.js  (CSP-safe)
// Runs user code as ES modules loaded from blob: URLs.
// No inline scripts, no eval/new Function, and iframe uses blob HTML.

export function runUserCode({ code = "", input = {}, sandbox = true, timeout = 2500 } = {}) {
  return sandbox
    ? runInSandbox({ code, input, timeout })
    : runInPage({ code, input, timeout });
}

// ---------- In-page (no sandbox), blob ES module ----------
function runInPage({ code, input, timeout }) {
  return new Promise((resolve) => {
    const id = `code:done:${crypto.randomUUID()}`;

    const userModuleSrc = `
      export default async function(input) {
        ${code}
      }
    `;
    const userUrl = URL.createObjectURL(new Blob([userModuleSrc], { type: "text/javascript" }));

    const bootSrc = `
      const __orig__ = { log: console.log, warn: console.warn, error: console.error, info: console.info };
      const logs = [];
      const proxy = (...a)=>logs.push(a.map(String).join(" "));
      console.log = proxy; console.warn = proxy; console.error = proxy; console.info = proxy;

      import userMain from "${userUrl}";
      (async () => {
        try {
          const result = await userMain(${JSON.stringify(input)});
          window.dispatchEvent(new CustomEvent("${id}", { detail: { ok: true, result, logs } }));
        } catch (err) {
          window.dispatchEvent(new CustomEvent("${id}", { detail: { ok: false, error: String(err), logs } }));
        } finally {
          console.log = __orig__.log; console.warn = __orig__.warn; console.error = __orig__.error; console.info = __orig__.info;
          URL.revokeObjectURL("${userUrl}");
        }
      })();
    `;
    const bootUrl = URL.createObjectURL(new Blob([bootSrc], { type: "text/javascript" }));

    const s = document.createElement("script");
    s.type = "module";
    s.src = bootUrl;

    let finished = false;
    const finish = (payload) => {
      if (finished) return;
      finished = true;
      try { URL.revokeObjectURL(bootUrl); } catch {}
      s.remove();
      resolve(payload);
    };

    const onDone = (e) => {
      window.removeEventListener(id, onDone);
      finish(e.detail);
    };

    const to = setTimeout(() => {
      window.removeEventListener(id, onDone);
      finish({ ok: false, error: "Timeout", logs: [] });
    }, timeout);

    window.addEventListener(id, onDone, { once: true });
    s.onerror = () => {
      clearTimeout(to);
      window.removeEventListener(id, onDone);
      finish({ ok: false, error: "Module load error", logs: [] });
    };

    document.body.appendChild(s);
  });
}

// ---------- Iframe sandbox (blob HTML + blob module) ----------
function runInSandbox({ code, input, timeout }) {
  return new Promise((resolve) => {
    // 1) Build the iframe boot module as a Blob URL (no inline scripts anywhere)
    const bootSrc = `
      // This runs INSIDE the iframe as a module
      const __orig__ = { log: console.log, warn: console.warn, error: console.error, info: console.info };
      const logs = [];
      const proxy = (...a)=>logs.push(a.map(String).join(" "));
      console.log = proxy; console.warn = proxy; console.error = proxy; console.info = proxy;

      // Wait for the parent to post the user's code & input
      window.addEventListener("message", async (e) => {
        try {
          const { code, input } = e.data || {};
          // Create the user module inside the iframe so its origin is this doc
          const userModuleSrc = "export default async function(input){\\n" + code + "\\n}";
          const userUrl = URL.createObjectURL(new Blob([userModuleSrc], { type: "text/javascript" }));
          try {
            const mod = await import(userUrl);
            const result = await mod.default(input);
            parent.postMessage({ ok: true, result, logs }, "*");
          } catch (err) {
            parent.postMessage({ ok: false, error: String(err), logs }, "*");
          } finally {
            URL.revokeObjectURL(userUrl);
            console.log = __orig__.log; console.warn = __orig__.warn; console.error = __orig__.error; console.info = __orig__.info;
          }
        } catch (err) {
          parent.postMessage({ ok: false, error: String(err), logs }, "*");
        }
      }, { once: true });
    `;
    const bootUrl = URL.createObjectURL(new Blob([bootSrc], { type: "text/javascript" }));

    // 2) Build the iframe HTML via srcdoc with NO inline scripts, only a blob: module
    const html = `
      <!doctype html>
      <html>
        <head>
          <!-- Tight CSP for the iframe document: allow only blob: scripts -->
          <meta http-equiv="Content-Security-Policy"
                content="default-src 'none'; script-src blob:; connect-src 'none'; img-src 'none'; style-src 'none'">
        </head>
        <body>
          <script type="module" src="${bootUrl}"></script>
        </body>
      </html>
    `;

    // 3) Create the iframe. Important: allow-same-origin so blob: imports work in Chromium/Electron.
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    iframe.srcdoc = html;
    document.body.appendChild(iframe);

    let finished = false;
    let to = null;

    const finish = (payload) => {
      if (finished) return;
      finished = true;
      window.removeEventListener("message", onMsg);
      clearTimeout(to);
      try { iframe.remove(); } catch {}
      try { URL.revokeObjectURL(bootUrl); } catch {}
      resolve(payload);
    };

    const onMsg = (e) => {
      const d = e.data || {};
      if (typeof d.ok === "boolean") finish(d);
    };

    const loadFail = setTimeout(() => {
      window.removeEventListener("message", onMsg);
      try { iframe.remove(); } catch {}
      try { URL.revokeObjectURL(bootUrl); } catch {}
      resolve({ ok: false, error: "Sandbox load error", logs: [] });
    }, 800);

    iframe.addEventListener("load", () => {
      clearTimeout(loadFail);
      window.addEventListener("message", onMsg);
      to = setTimeout(() => finish({ ok: false, error: "Timeout", logs: [] }), timeout);
      // Kick it off — no inline code, just postMessage
      iframe.contentWindow.postMessage({ code, input }, "*");
    });
  });
}
