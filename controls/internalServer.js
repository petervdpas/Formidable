// controls/internalServer.js

const path = require("path");
const express = require("express");
const { renderPage } = require("./pageGenerator");
const {
  getVirtualStructure,
  loadAndRenderForm,
  loadTemplateYaml,
} = require("./serverDataProvider");
const configManager = require("./configManager");

let server = null;
let currentPort = null;
const sockets = new Set();

function startInternalServer(port = 8383) {
  if (server) {
    console.log(`[InternalServer] Already running on port ${currentPort}`);
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

        return `<li><a href="/template/${encodeURIComponent(
          t
        )}">${displayName}</a></li>`;
      })
    );

    const body = `
      <p>Welcome to the Formidable Internal Server.</p>
      <h2>Available Templates</h2>
      <ul>${templateLinks.join("")}</ul>
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
    const metaFiles = vfs.templateStorageFolders?.[tmpl]?.metaFiles || [];

    const formLinks = metaFiles
      .map(
        (f) =>
          `<li><a href="/template/${encodeURIComponent(
            tmpl
          )}/form/${encodeURIComponent(f)}">${f}</a></li>`
      )
      .join("");

    const body = `
      <p><a href="/">⬅ Back to Home</a></p>
      <p>Template: <strong>${tmpl}</strong></p>
      <h2>Forms</h2>
      <ul>${formLinks}</ul>
    `;

    res.send(
      renderPage({
        title: `Template: ${tmpl}`,
        body,
        footerNote: `Running on port ${currentPort}`,
      })
    );
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

  // Start server
  server = app.listen(port, () => {
    const addr = server.address();
    currentPort = addr && typeof addr === "object" ? addr.port : port;
    console.log(`[InternalServer] Running at http://localhost:${currentPort}/`);
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
      console.log(
        `[InternalServer] Stopping server... closing connections (${sockets.size})`
      );

      for (const socket of sockets) {
        socket.destroy();
      }

      server.close((err) => {
        if (err) {
          console.log(`[InternalServer] Error stopping:`, err);
          return reject(err);
        }
        console.log(`[InternalServer] Stopped`);
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
