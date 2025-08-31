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

  // storage (as before)
  app.use("/storage",
    express.static(path.resolve(configManager.getContextStoragePath()))
  );

  // ----- Assets dir: packaged vs dev
  const assetsDir = electronApp && electronApp.isPackaged
    ? path.join(process.resourcesPath, "assets")
    : path.join(__dirname, "../assets");

  log(`[InternalServer] assetsDir = ${assetsDir}`);

  // static mount
  app.use("/assets", express.static(assetsDir, { maxAge: "7d", etag: true }));

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
      <p><a href="/virtual">View Virtual Structure (JSON)</a></p>
    `;

    res.send(
      renderPage({
        title: "Formidable Wiki",
        body,
        footerNote: `Running on port ${currentPort}`,
      })
    );
  });

  // JSON - Virtual Structure (pretty printed)
  app.get("/virtual", async (req, res) => {
    const vfs = await getVirtualStructure();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(JSON.stringify(vfs, null, 2));
  });

  // HTML - Template List of Forms
  app.get("/template/:template", async (req, res) => {
    const tmpl = req.params.template;
    const vfs = await getVirtualStructure();
    const templateInfo = vfs.templateStorageFolders?.[tmpl];

    if (!templateInfo?.filename) {
      res.status(404).send(
        renderPage({
          title: "Template Not Found",
          body: `<p>Template "${tmpl}" not found.</p><p><a href="/">Back to Home</a></p>`,
          footerNote: `Running on port ${currentPort}`,
        })
      );
      return;
    }

    // Use extended list to get titles
    const forms = await extendedListForms(templateInfo.filename);
    const yaml = await loadTemplateYaml(templateInfo.filename);
    const sidebarExpr = yaml?.sidebar_expression || null;

    const formLinks = forms
      .map((form) => {
        const href = `/template/${encodeURIComponent(
          tmpl
        )}/form/${encodeURIComponent(form.filename)}`;
        const title = form.title || form.filename;

        // Try to compute the sidebar expression text, if configured
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

        return `<li class="form-picker-item">
          <a href="${href}" class="form-link">
            <span class="form-link-title">${escapeHtml(title)}</span>
            ${exprHtml ? `<span class="expr-wrapper">${exprHtml}</span>` : ""}
          </a>
        </li>`;
      })
      .join("");

    const body = `
      <p><a href="/">⬅ Back to Home</a></p>
      <p>Template: <strong>${tmpl}</strong></p>
      <h2>Forms</h2>
      <ul class="form-picker-list">${formLinks}</ul>
    `;

    res.send(
      renderPage({
        title: `Template: ${tmpl}`,
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
          body: `<p>Template "${tmpl}" not found or invalid.</p><p><a href="/">Back to Home</a></p>`,
          footerNote: `Running on port ${currentPort}`,
        })
      );
      return;
    }

    const { form, md, html } = await loadAndRenderForm(
      templateInfo.filename,
      formFile
    );

    if (!form) {
      res.status(404).send(
        renderPage({
          title: "Form Not Found",
          body: `<p>Form "${formFile}" not found in template "${tmpl}".</p><p><a href="/">Back to Home</a></p>`,
          footerNote: `Running on port ${currentPort}`,
        })
      );
      return;
    }

    const body = `
      <p><a href="/template/${encodeURIComponent(
        tmpl
      )}">⬅ Back to Template</a></p>
      <h2>Form: ${formFile}</h2>
      <article>${html}</article>
    `;

    res.send(
      renderPage({
        title: `Form: ${formFile}`,
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
