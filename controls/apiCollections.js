// controls/apiCollections.js

const path = require("path");
const express = require("express");
const swaggerUi = require("swagger-ui-express");

const {
  getVirtualStructure,
  loadTemplateYaml,
  listCollection,
  resolveFormById,
  isCollectionEnabled,
  statRev,
  collectionRev,
} = require("./serverDataProvider");

const formManager = require("./formManager");
const configManager = require("./configManager");

function guidKeyOfTemplate(yaml) {
  const f = (yaml?.fields || []).find((x) => x?.type === "guid");
  return f ? f.key : null;
}

function mountApiCollections(app) {
  const router = express.Router();

  router.use(express.json({ limit: "2mb" }));

  router.get("/collections/:template/count", async (req, res) => {
    const tmpl = `${req.params.template}.yaml`;
    const out = await listCollection(tmpl, { limit: 1, offset: 0 });
    if (!out.collectionEnabled)
      return res.status(403).json({ error: "collection-disabled" });
    res.json({
      template: req.params.template,
      total: out.total || out.items?.length || 0,
    });
  });

  router.get("/collections", async (req, res) => {
    const vfs = await getVirtualStructure();
    const names = Object.keys(vfs.templateStorageFolders || {});
    const rows = [];
    for (const n of names) {
      const desc = vfs.templateStorageFolders[n];
      const y = await loadTemplateYaml(desc.filename);
      if (isCollectionEnabled(y)) {
        rows.push({
          id: n,
          name: y.name || n,
          href: `/api/collections/${encodeURIComponent(n)}`,
        });
      }
    }
    res.json(rows);
  });

  router.get("/collections/:template", async (req, res) => {
    const vfs = await getVirtualStructure();
    if (!vfs.templateStorageFolders?.[req.params.template]) {
      return res.status(404).json({ error: "template-not-found" });
    }

    const tmpl = `${req.params.template}.yaml`;
    const rev = await collectionRev(tmpl);
    if (
      req.headers["if-none-match"] === rev.etag ||
      req.headers["if-modified-since"] === rev.lastModified
    ) {
      return res.status(304).end();
    }

    const { limit, offset, q, tags } = req.query;
    const out = await listCollection(tmpl, {
      limit: Number(limit) || 100,
      offset: Number(offset) || 0,
      q: q || "",
      tags: tags || "",
    });

    if (!out.collectionEnabled) {
      return res.status(403).json({ error: "collection-disabled" });
    }

    res.setHeader("ETag", rev.etag);
    res.setHeader("Last-Modified", rev.lastModified);
    res.json(out);
  });

  router.get("/collections/:template/:id", async (req, res) => {
    const tmpl = `${req.params.template}.yaml`;
    const id = req.params.id;
    const resolved = await resolveFormById(tmpl, id);
    if (!resolved.ok) {
      return res
        .status(resolved.code || 404)
        .json({ error: resolved.reason || "not-found" });
    }

    const rev = statRev(resolved.absPath);
    if (
      req.headers["if-none-match"] === rev.etag ||
      req.headers["if-modified-since"] === rev.lastModified
    ) {
      return res.status(304).end();
    }

    res.setHeader("ETag", rev.etag);
    res.setHeader("Last-Modified", rev.lastModified);

    const itemField = (resolved.template?.item_field || "").trim() || null;
    const title =
      resolved.form?.title ||
      (itemField && resolved.form?.data?.[itemField]) ||
      resolved.formFile;

    res.json({
      template: req.params.template,
      id,
      filename: resolved.formFile,
      title,
      meta: resolved.form?.meta || {},
      data: resolved.form?.data || {},
      links: {
        html: `/template/${encodeURIComponent(
          req.params.template
        )}/form/${encodeURIComponent(resolved.formFile)}`,
        self: `/api/collections/${encodeURIComponent(
          req.params.template
        )}/${encodeURIComponent(id)}`,
      },
      rev: { etag: rev.etag, lastModified: rev.lastModified },
    });
  });

  router.post("/collections/:template", async (req, res) => {
    const tmpl = `${req.params.template}.yaml`;
    const yaml = await loadTemplateYaml(tmpl);

    if (!yaml || !isCollectionEnabled(yaml)) {
      return res.status(403).json({ error: "collection-disabled" });
    }

    const guidKey = guidKeyOfTemplate(yaml);
    const payload = req.body || {};
    const data = payload.data || {};
    const meta = payload.meta || {};

    const guid = data?.[guidKey];
    if (!guid) {
      return res.status(400).json({
        error: "guid-missing",
        message: `Body.data must include the GUID field "${guidKey}".`,
      });
    }

    // reject if the GUID already exists:
    const exists = await resolveFormById(tmpl, String(guid));
    if (exists.ok) {
      return res
        .status(409)
        .json({ error: "already-exists", id: String(guid) });
    }

    // choose a filename. simplest: GUID.meta.json
    const filename = `${String(guid)}.meta.json`;

    // sanitize/validate via formManager.saveForm
    const result = formManager.saveForm(
      tmpl,
      filename,
      { meta, data },
      yaml.fields
    );
    if (!result?.success) {
      return res
        .status(500)
        .json({ error: "save-failed", detail: result?.error });
    }

    const absPath = path.join(
      configManager.getTemplateStoragePath(tmpl),
      filename
    );
    const rev = statRev(absPath);

    res.setHeader("ETag", rev.etag);
    res.setHeader("Last-Modified", rev.lastModified);
    res
      .status(201)
      .location(
        `/api/collections/${encodeURIComponent(
          req.params.template
        )}/${encodeURIComponent(String(guid))}`
      )
      .json({
        template: req.params.template,
        id: String(guid),
        filename,
        meta,
        data,
        links: {
          self: `/api/collections/${encodeURIComponent(
            req.params.template
          )}/${encodeURIComponent(String(guid))}`,
          html: `/template/${encodeURIComponent(
            req.params.template
          )}/form/${encodeURIComponent(filename)}`,
        },
        rev: { etag: rev.etag, lastModified: rev.lastModified },
      });
  });

  router.put("/collections/:template/:id", async (req, res) => {
    const tmpl = `${req.params.template}.yaml`;
    const yaml = await loadTemplateYaml(tmpl);
    if (!yaml || !isCollectionEnabled(yaml)) {
      return res.status(403).json({ error: "collection-disabled" });
    }

    const guidKey = guidKeyOfTemplate(yaml);
    const id = String(req.params.id);

    const resolved = await resolveFormById(tmpl, id);
    if (!resolved.ok)
      return res
        .status(resolved.code || 404)
        .json({ error: resolved.reason || "not-found" });

    const payload = req.body || {};
    const data = payload.data || {};
    const meta = payload.meta || {};

    // guard: you may enforce id immutability here (incoming data must keep the same GUID)
    if (data?.[guidKey] && String(data[guidKey]) !== id) {
      return res.status(409).json({
        error: "guid-mismatch",
        message: `Payload ${guidKey} must equal path id.`,
      });
    }
    // if not provided, keep the original GUID:
    if (!data?.[guidKey]) data[guidKey] = id;

    const result = formManager.saveForm(
      tmpl,
      resolved.formFile,
      { meta, data },
      yaml.fields
    );
    if (!result?.success) {
      return res
        .status(500)
        .json({ error: "save-failed", detail: result?.error });
    }

    const rev = statRev(resolved.absPath);
    res.setHeader("ETag", rev.etag);
    res.setHeader("Last-Modified", rev.lastModified);

    res.json({
      template: req.params.template,
      id,
      filename: resolved.formFile,
      meta,
      data,
      links: {
        self: `/api/collections/${encodeURIComponent(
          req.params.template
        )}/${encodeURIComponent(id)}`,
        html: `/template/${encodeURIComponent(
          req.params.template
        )}/form/${encodeURIComponent(resolved.formFile)}`,
      },
      rev: { etag: rev.etag, lastModified: rev.lastModified },
    });
  });

  router.delete("/collections/:template/:id", async (req, res) => {
    const tmpl = `${req.params.template}.yaml`;
    const yaml = await loadTemplateYaml(tmpl);
    if (!yaml || !isCollectionEnabled(yaml)) {
      return res.status(403).json({ error: "collection-disabled" });
    }

    const resolved = await resolveFormById(tmpl, String(req.params.id));
    if (!resolved.ok)
      return res
        .status(resolved.code || 404)
        .json({ error: resolved.reason || "not-found" });

    const ok = formManager.deleteForm(tmpl, resolved.formFile);
    if (!ok) return res.status(500).json({ error: "delete-failed" });

    return res.sendStatus(204);
  });

  router.head("/collections/:template/:id", async (req, res) => {
    const tmpl = `${req.params.template}.yaml`;
    const resolved = await resolveFormById(tmpl, req.params.id);
    if (!resolved.ok) return res.sendStatus(resolved.code || 404);
    const rev = statRev(resolved.absPath);
    res.setHeader("ETag", rev.etag);
    res.setHeader("Last-Modified", rev.lastModified);
    res.end();
  });

  router.get("/collections/:template/export.ndjson", async (req, res) => {
    const tmpl = `${req.params.template}.yaml`;
    const yaml = await loadTemplateYaml(tmpl);
    if (!yaml || !isCollectionEnabled(yaml)) {
      return res.status(403).json({ error: "collection-disabled" });
    }

    const rev = await collectionRev(tmpl);
    if (
      req.headers["if-none-match"] === rev.etag ||
      req.headers["if-modified-since"] === rev.lastModified
    ) {
      return res.status(304).end();
    }

    res.setHeader("ETag", rev.etag);
    res.setHeader("Last-Modified", rev.lastModified);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");

    const full = await listCollection(tmpl, {
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0,
    });

    for (const it of full.items) {
      const resolved = await resolveFormById(tmpl, it.id);
      if (!resolved.ok) continue;
      res.write(
        JSON.stringify({
          id: it.id,
          filename: resolved.formFile,
          title: it.title,
          meta: resolved.form?.meta || {},
          data: resolved.form?.data || {},
        }) + "\n"
      );
    }
    res.end();
  });

  router.get("/collections/:template/export.csv", async (req, res) => {
    const tmpl = `${req.params.template}.yaml`;
    const yaml = await loadTemplateYaml(tmpl);
    if (!yaml || !isCollectionEnabled(yaml)) {
      return res.status(403).json({ error: "collection-disabled" });
    }

    const rev = await collectionRev(tmpl);
    if (
      req.headers["if-none-match"] === rev.etag ||
      req.headers["if-modified-since"] === rev.lastModified
    ) {
      return res.status(304).end();
    }

    res.setHeader("ETag", rev.etag);
    res.setHeader("Last-Modified", rev.lastModified);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${req.params.template}-export.csv"`
    );
    res.write("\uFEFF");
    res.write(`id,filename,title,tags\n`);

    const itemField = (yaml?.item_field || "").trim() || null;
    const full = await listCollection(tmpl, {
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0,
    });

    for (const it of full.items) {
      const resolved = await resolveFormById(tmpl, it.id);
      if (!resolved.ok) continue;
      const title =
        resolved.form?.title ||
        (itemField && resolved.form?.data?.[itemField]) ||
        resolved.formFile;
      const tags = (it.tags || []).join(";");
      const row = [it.id, resolved.formFile, title, tags].map(
        (s) => `"${String(s ?? "").replace(/"/g, '""')}"`
      );
      res.write(row.join(",") + "\n");
    }
    res.end();
  });

  async function buildOpenApiSpec(baseUrl = "/api") {
    const vfs = await getVirtualStructure();
    const templates = Object.entries(vfs.templateStorageFolders || {});
    const enabled = [];
    for (const [id, desc] of templates) {
      const y = await loadTemplateYaml(desc.filename);
      if (y && y.enable_collection === true && guidKeyOfTemplate(y)) {
        enabled.push({ id, name: y.name || id, guidKey: guidKeyOfTemplate(y) });
      }
    }

    return {
      openapi: "3.0.3",
      info: {
        title: "Formidable Collections API",
        version: "1.0.0",
        description:
          "CRUD over collection-enabled templates. Identity is the GUID field defined in each template.",
      },
      servers: [{ url: baseUrl }],
      components: {
        parameters: {
          TemplateParam: {
            name: "template",
            in: "path",
            required: true,
            schema: { type: "string", enum: enabled.map((t) => t.id) },
            description: "Template id (collection-enabled).",
          },
          IdParam: {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Item GUID.",
          },
        },
        schemas: {
          Item: {
            type: "object",
            properties: {
              template: { type: "string" },
              id: { type: "string", description: "GUID" },
              filename: { type: "string" },
              title: { type: "string" },
              meta: { type: "object", additionalProperties: true },
              data: { type: "object", additionalProperties: true },
              rev: {
                type: "object",
                properties: {
                  etag: { type: "string" },
                  lastModified: { type: "string" },
                },
              },
              links: {
                type: "object",
                properties: {
                  self: { type: "string" },
                  html: { type: "string" },
                },
              },
            },
            required: ["template", "id", "filename", "data"],
          },
          ListResponse: {
            type: "object",
            properties: {
              collectionEnabled: { type: "boolean" },
              template: { type: "string" },
              total: { type: "integer" },
              limit: { type: "integer" },
              offset: { type: "integer" },
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/Item" },
              },
            },
          },
          UpsertPayload: {
            type: "object",
            properties: {
              meta: { type: "object", additionalProperties: true },
              data: { type: "object", additionalProperties: true },
            },
            required: ["data"],
          },
        },
      },
      paths: {
        "/collections": {
          get: {
            summary: "List collection-enabled templates",
            responses: { 200: { description: "OK" } },
          },
        },
        "/collections/{template}": {
          get: {
            summary: "List items (paged)",
            parameters: [
              { $ref: "#/components/parameters/TemplateParam" },
              {
                name: "limit",
                in: "query",
                schema: { type: "integer", default: 100 },
              },
              {
                name: "offset",
                in: "query",
                schema: { type: "integer", default: 0 },
              },
              { name: "q", in: "query", schema: { type: "string" } },
              { name: "tags", in: "query", schema: { type: "string" } },
            ],
            responses: {
              200: {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ListResponse" },
                  },
                },
              },
              403: { description: "collection-disabled" },
            },
          },
          post: {
            summary: "Create new item (GUID required in data)",
            parameters: [{ $ref: "#/components/parameters/TemplateParam" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UpsertPayload" },
                },
              },
            },
            responses: {
              201: {
                description: "Created",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Item" },
                  },
                },
              },
              400: { description: "guid-missing" },
              403: { description: "collection-disabled" },
              409: { description: "already-exists" },
            },
          },
        },
        "/collections/{template}/{id}": {
          get: {
            summary: "Fetch single item by GUID",
            parameters: [
              { $ref: "#/components/parameters/TemplateParam" },
              { $ref: "#/components/parameters/IdParam" },
            ],
            responses: {
              200: {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Item" },
                  },
                },
              },
              404: { description: "not-found" },
            },
          },
          put: {
            summary: "Replace item by GUID",
            parameters: [
              { $ref: "#/components/parameters/TemplateParam" },
              { $ref: "#/components/parameters/IdParam" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UpsertPayload" },
                },
              },
            },
            responses: {
              200: {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Item" },
                  },
                },
              },
              403: { description: "collection-disabled" },
              404: { description: "not-found" },
              409: { description: "guid-mismatch" },
            },
          },
          delete: {
            summary: "Delete item by GUID",
            parameters: [
              { $ref: "#/components/parameters/TemplateParam" },
              { $ref: "#/components/parameters/IdParam" },
            ],
            responses: {
              204: { description: "No Content" },
              404: { description: "not-found" },
            },
          },
          head: {
            summary: "HEAD (ETag/Last-Modified only)",
            parameters: [
              { $ref: "#/components/parameters/TemplateParam" },
              { $ref: "#/components/parameters/IdParam" },
            ],
            responses: {
              200: { description: "OK" },
              404: { description: "not-found" },
            },
          },
        },
      },
    };
  }

  // serve raw OpenAPI JSON
  router.get("/openapi.json", async (req, res) => {
    const spec = await buildOpenApiSpec("/api");
    res.json(spec);
  });

  // pretty Swagger UI
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      explorer: false,
      swaggerOptions: { url: "/api/openapi.json" },
    })
  );

  app.use("/api", router);
}

module.exports = { mountApiCollections };
