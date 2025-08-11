// controls/internalServer.js

const path = require("path");
const express = require("express");
const { renderPage } = require("./pageGenerator");
const {
  getVirtualStructure,
  extendedListForms,
  loadAndRenderForm,
  loadTemplateYaml,
} = require("./serverDataProvider");
const configManager = require("./configManager");
const { log } = require("./nodeLogger");

let server = null;
let currentPort = null;
const sockets = new Set();

function startInternalServer(port = 8383) {
  if (server) {
    log(`[InternalServer] Already running on port ${currentPort}`);
    return;
  }

  const app = express();

  // Serve storage files (images, etc)
  app.use(
    "/storage",
    express.static(path.resolve(configManager.getContextStoragePath()))
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

    const formLinks = forms
      .map(
        (form) =>
          `<li class="form-picker-item"><a href="/template/${encodeURIComponent(
            tmpl
          )}/form/${encodeURIComponent(form.filename)}">${
            form.title || form.filename
          }</a></li>`
      )
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
