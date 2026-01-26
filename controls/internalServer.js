// controls/internalServer.js

const path = require("path");
const express = require("express");
const { app: electronApp } = require("electron");
const { renderPage } = require("./pageGenerator");
const {
  getVirtualStructure,
  extendedListForms,
  loadAndRenderForm,
  loadTemplateYaml,
} = require("./serverDataProvider");
const configManager = require("./configManager");
const { log } = require("./nodeLogger");
const miniExprParser = require("./miniExprParser");
const { mountApiCollections } = require("./apiCollections");

let server = null;
let currentPort = null;
const sockets = new Set();

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function startInternalServer(port = 8383) {
  if (server) {
    log(`[InternalServer] Already running on port ${currentPort}`);
    return;
  }

  const app = express(); // <-- this is the Express app (no clash now)

  // Storage: always get fresh config to ensure we use the correct user-configured path
  const userConfig = configManager.loadUserConfig();
  const contextBase = require('./fileManager').resolvePath(userConfig.context_folder || "./examples");
  const storagePath = path.join(contextBase, "storage");
  
  log(`[InternalServer] Context folder: ${userConfig.context_folder}`);
  log(`[InternalServer] Resolved storage path: ${storagePath}`);
  
  app.use("/storage", express.static(storagePath, {
    fallthrough: true,
    redirect: false,
  }));
  
  // If file not found, show detailed diagnostic page
  app.use("/storage", (req, res, next) => {
    const fs = require('fs');
    const requestedPath = req.path;
    const fullPath = path.join(storagePath, requestedPath);
    const dir = path.dirname(fullPath);
    
    let dirExists = false;
    let filesInDir = [];
    try {
      dirExists = fs.existsSync(dir);
      if (dirExists) {
        filesInDir = fs.readdirSync(dir);
      }
    } catch (err) {
      // ignore
    }
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>File Not Found - Formidable</title></head>
      <body style="font-family: monospace; padding: 20px; background: #f5f5f5;">
        <h2>❌ File Not Found</h2>
        <p><strong>Requested URL:</strong> ${escapeHtml(req.url)}</p>
        <p><strong>Storage Root:</strong> <code>${escapeHtml(storagePath)}</code></p>
        <p><strong>Full Path:</strong> <code>${escapeHtml(fullPath)}</code></p>
        <p><strong>Directory Exists:</strong> ${dirExists ? '✅ Yes' : '❌ No'}</p>
        ${dirExists ? `
          <p><strong>Files in directory:</strong></p>
          <ul>${filesInDir.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
        ` : `<p><strong>Directory:</strong> <code>${escapeHtml(dir)}</code></p>`}
      </body>
      </html>
    `;
    
    res.status(404).send(html);
  });

  // ----- Assets dir: packaged vs dev
  const assetsDir =
    electronApp && electronApp.isPackaged
      ? path.join(process.resourcesPath, "assets")
      : path.join(__dirname, "../assets");

  const isDev = !(electronApp && electronApp.isPackaged);
  log(`[InternalServer] assetsDir = ${assetsDir} | dev=${isDev}`);

  if (isDev) {
    // DEV: never cache
    app.use(
      "/assets",
      express.static(assetsDir, {
        etag: false,
        lastModified: false,
        cacheControl: false,
        maxAge: 0,
        setHeaders: (res) => res.setHeader("Cache-Control", "no-store"),
      })
    );
  } else {
    // PROD: cache for a while (safe because we’ll bust with a version query)
    app.use(
      "/assets",
      express.static(assetsDir, {
        etag: true,
        maxAge: "30d",
      })
    );
  }

  // --- REST API: collections-only ---
  mountApiCollections(app);

  // favicon at root (browsers auto-hit /favicon.ico)
  app.get("/favicon.ico", (req, res) =>
    res.sendFile(path.join(assetsDir, "formidable.ico"))
  );

  // Index Page (HTML)
  app.get("/", async (req, res) => {
    const vfs = await getVirtualStructure();
    const templates = Object.keys(vfs.templateStorageFolders || {});

    const templateLinks = await Promise.all(
      templates.map(async (t) => {
        const templateInfo = vfs.templateStorageFolders?.[t];
        const yaml = await loadTemplateYaml(templateInfo?.filename);
        const displayName = yaml?.name?.trim() || t;

        return `<li class="template-item"><a href="/template/${encodeURIComponent(
          t
        )}">${displayName}</a></li>`;
      })
    );

    const body = `
      <p>Welcome to the Formidable Internal Server.</p>
      <h2>Available Templates</h2>
      <ul class="template-list">${templateLinks.join("")}</ul>

      <div class="after-list">
        <a href="/api/docs" class="link-chip" aria-label="Open API docs (Swagger)">
          Open API docs (Swagger)
        </a>
      </div>
    `;

    res.send(
      renderPage({
        title: "Formidable Wiki",
        body,
        footerNote: `Running on port ${currentPort}`,
      })
    );
  });

  // JSON - Virtual Structure (DEV only)
  if (process.env.NODE_ENV !== "production") {
    app.get("/virtual", async (req, res) => {
      const vfs = await getVirtualStructure();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(JSON.stringify(vfs, null, 2));
    });
  }

  // HTML - Template List of Forms
  app.get("/template/:template", async (req, res) => {
    const tmpl = req.params.template;
    const vfs = await getVirtualStructure();
    const templateInfo = vfs.templateStorageFolders?.[tmpl];

    if (!templateInfo?.filename) {
      res.status(404).send(
        renderPage({
          title: "Template Not Found",
          body: `<p>Template "${escapeHtml(tmpl)}" not found.</p>`,
          footerNote: `Running on port ${currentPort}`,
        })
      );
      return;
    }

    // Source data
    const forms = await extendedListForms(templateInfo.filename);
    const yaml = await loadTemplateYaml(templateInfo.filename);
    const sidebarExpr = yaml?.sidebar_expression || null;
    const templateDisplayName = (yaml?.name || tmpl).toString().trim();

    const formLinks = forms
      .map((form) => {
        const href = `/template/${encodeURIComponent(
          tmpl
        )}/form/${encodeURIComponent(form.filename)}`;

        const title = (form.title || form.filename || "").toString();
        const tagsArr =
          (Array.isArray(form.tags) && form.tags) ||
          (Array.isArray(form.meta?.tags) && form.meta.tags) ||
          (Array.isArray(form.data?.meta?.tags) && form.data.meta.tags) ||
          [];

        const tagAttr = tagsArr.map((t) => String(t).toLowerCase()).join(" ");

        let exprHtml = "";
        if (sidebarExpr && form.expressionItems) {
          try {
            const result = miniExprParser.parseMiniExpr(
              sidebarExpr,
              form.expressionItems
            );
            if (result && typeof result === "object" && result.text) {
              const classes = Array.isArray(result.classes)
                ? result.classes.join(" ")
                : "";
              exprHtml = `<span class="expr-sublabel ${classes}">${escapeHtml(
                result.text
              )}</span>`;
            } else if (typeof result === "string") {
              exprHtml = `<span class="expr-sublabel">${escapeHtml(
                result
              )}</span>`;
            }
          } catch {
            exprHtml = `<span class="expr-sublabel expr-text-red expr-italic">[EXPR ERROR]</span>`;
          }
        }

        return `<li class="form-picker-item" data-tags="${escapeHtml(tagAttr)}">
      <a href="${href}" class="form-link">
        <span class="form-link-title">${escapeHtml(title)}</span>
        ${exprHtml ? `<span class="expr-wrapper">${exprHtml}</span>` : ""}
      </a>
    </li>`;
      })
      .join("");

    // Expose friendly names for crumbs.js
    const pageMeta = {
      templateId: tmpl,
      templateName: templateDisplayName,
    };

    const body = `
    <script>window.__FORMIDABLE__ = ${JSON.stringify(pageMeta)};</script>
    <h2>Available Forms</h2>
    <ul class="form-picker-list">${formLinks}</ul>
  `;

    res.send(
      renderPage({
        title: `Template: ${templateDisplayName}`,
        body,
        footerNote: `Running on port ${currentPort}`,
      })
    );
  });

  app.get("/template/:template/extended-list", async (req, res) => {
    const tmpl = req.params.template;
    const vfs = await getVirtualStructure();
    const templateInfo = vfs.templateStorageFolders?.[tmpl];

    if (!templateInfo?.filename) {
      res.status(404).send({
        error: "Template not found",
        template: tmpl,
      });
      return;
    }

    const result = await extendedListForms(templateInfo.filename);

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(JSON.stringify(result, null, 2));
  });

  // HTML - Rendered Form
  app.get("/template/:template/form/:formFile", async (req, res) => {
    const tmpl = req.params.template;
    const formFile = req.params.formFile;

    const vfs = await getVirtualStructure();
    const templateInfo = vfs.templateStorageFolders?.[tmpl];

    if (!templateInfo?.filename) {
      res.status(404).send(
        renderPage({
          title: "Template Not Found",
          body: `<p>Template "${escapeHtml(tmpl)}" not found or invalid.</p>`,
          footerNote: `Running on port ${currentPort}`,
        })
      );
      return;
    }

    const { form, html } = await loadAndRenderForm(
      templateInfo.filename,
      formFile
    );

    if (!form) {
      res.status(404).send(
        renderPage({
          title: "Form Not Found",
          body: `<p>Form "${escapeHtml(
            formFile
          )}" not found in template "${escapeHtml(tmpl)}".</p>`,
          footerNote: `Running on port ${currentPort}`,
        })
      );
      return;
    }

    // Read template YAML to determine item field + friendly template name
    const yaml = await loadTemplateYaml(templateInfo.filename);
    const templateDisplayName = (yaml?.name || tmpl).toString().trim();
    const itemFieldKey =
      (yaml?.item_field || yaml?.itemField || "").toString().trim() || null;

    // Friendly form title: precomputed -> item field value -> filename
    const formTitle =
      form?.title ||
      (itemFieldKey && form?.data && form.data[itemFieldKey]) ||
      formFile;

    // Expose meta for crumbs.js
    const pageMeta = {
      templateId: tmpl,
      templateName: templateDisplayName,
      formFile,
      formTitle: String(formTitle),
    };

    const body = `
    <script>window.__FORMIDABLE__ = ${JSON.stringify(pageMeta)};</script>
    <article>${html}</article>
  `;

    res.send(
      renderPage({
        title: `Form: ${String(formTitle)}`,
        body,
        footerNote: `Running on port ${currentPort}`,
      })
    );
  });

  // MiniExpr Test Page
  app.get("/miniexpr", (req, res) => {
    const sampleContext = {
      test: "Hello",
      check: true,
      value: 42,
      score: 75,
      other: "World",
    };

    const examples = [
      `[test]`,
      `[test + " (" + value + ")"]`,
      `[check ? "green" : "red"]`,
      `[score > 50 ? "Pass" : "Fail"]`,
      `[test + " → " + other + " → " + value]`,
      `[value * 2 + score / 5]`,
      `[ { label: test, color: check ? "green" : "red" } ]`,
      `[ { label: "Score: " + score, color: score > 50 ? "blue" : "orange" } ]`,
    ];

    const miniExprParser = require("./miniExprParser");

    const results = examples.map((expr) => {
      const result = miniExprParser.parseMiniExpr(expr, sampleContext);

      const resultJson = JSON.stringify(result, null, 2);

      return `<tr>
      <td style="font-family:monospace;">${expr}</td>
      <td colspan="2"><pre style="margin:0;">${resultJson}</pre></td>
    </tr>`;
    });

    const body = `
    <p><a href="/">⬅ Back to Home</a></p>
    <h2>MiniExpr Parser Test</h2>
    <p>Sample context:</p>
    <pre>${JSON.stringify(sampleContext, null, 2)}</pre>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr><th>Expression</th><th colspan="2">Result Object</th></tr>
      </thead>
      <tbody>
        ${results.join("")}
      </tbody>
    </table>
  `;

    res.send(
      renderPage({
        title: "MiniExpr Parser Test",
        body,
        footerNote: `Running on port ${currentPort}`,
      })
    );
  });

  // Start server
  server = app.listen(port, () => {
    const addr = server.address();
    currentPort = addr && typeof addr === "object" ? addr.port : port;
    log(`[InternalServer] Running at http://localhost:${currentPort}/`);
  });

  // Track sockets
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => {
      sockets.delete(socket);
    });
  });
}

function stopInternalServer() {
  return new Promise((resolve, reject) => {
    if (server) {
      log(
        `[InternalServer] Stopping server... closing connections (${sockets.size})`
      );

      for (const socket of sockets) {
        socket.destroy();
      }

      server.close((err) => {
        if (err) {
          log(`[InternalServer] Error stopping:`, err);
          return reject(err);
        }
        log(`[InternalServer] Stopped`);
        server = null;
        currentPort = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

function getStatus() {
  return {
    running: !!server,
    port: currentPort,
  };
}

module.exports = {
  startInternalServer,
  stopInternalServer,
  getStatus,
};
