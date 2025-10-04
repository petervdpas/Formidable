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

function fieldToProperty(f = {}) {
  const schema = {};
  const optVals = (Array.isArray(f.options) ? f.options : []).map((o) =>
    String(o.value)
  );
  const optLabels = (Array.isArray(f.options) ? f.options : []).map((o) =>
    String(o.label ?? o.value)
  );

  switch ((f.type || "").toLowerCase()) {
    case "guid":
      Object.assign(schema, { type: "string", description: "GUID field" });
      break;
    case "text":
    case "textarea":
    case "latex":
    case "code":
      Object.assign(schema, { type: "string" });
      break;
    case "number":
      Object.assign(schema, { type: "number" });
      break;
    case "boolean":
      Object.assign(schema, { type: "boolean" });
      break;
    case "date":
      Object.assign(schema, { type: "string", format: "date" });
      break;
    case "dropdown":
    case "radio":
      Object.assign(schema, {
        type: "string",
        enum: optVals,
        "x-enum-labels": optLabels,
      });
      break;
    case "multioption":
      Object.assign(schema, {
        type: "array",
        items: { type: "string", enum: optVals },
      });
      break;
    case "range": {
      const byVal = Object.fromEntries(
        (f.options || []).map((o) => [
          String(o.value).toLowerCase(),
          o.label ?? o.value,
        ])
      );
      const min = Number(byVal.min);
      const max = Number(byVal.max);
      const step = Number(byVal.step);
      Object.assign(schema, {
        type: "number",
        ...(Number.isFinite(min) ? { minimum: min } : {}),
        ...(Number.isFinite(max) ? { maximum: max } : {}),
        ...(Number.isFinite(step) ? { multipleOf: step } : {}),
      });
      break;
    }
    case "list":
      Object.assign(schema, { type: "array", items: { type: "string" } });
      break;
    case "table": {
      const cols = (f.options || []).map((o) => String(o.value));
      Object.assign(schema, {
        type: "array",
        description: "Array of row objects keyed by column id",
        items: {
          type: "object",
          additionalProperties: false,
          properties: Object.fromEntries(
            cols.map((c) => [c, { type: "string" }])
          ),
        },
      });
      break;
    }
    case "image":
      Object.assign(schema, {
        type: "string",
        format: "uri",
        description:
          "Path/URL to image (e.g. /storage/<template>/images/<file>)",
      });
      break;
    case "link":
      Object.assign(schema, { type: "string", format: "uri" });
      break;
    case "tags":
      Object.assign(schema, { type: "array", items: { type: "string" } });
      break;
    default:
      Object.assign(schema, { type: "string" });
  }

  if (f.description) schema.description = f.description;
  return [f.key, schema];
}

function makeDataSchema(yaml) {
  const props = {};
  const required = [];
  for (const f of yaml?.fields || []) {
    if (!f?.key) continue;
    const [k, s] = fieldToProperty(f);
    props[k] = s;
    if (f.type === "guid") required.push(k);
  }
  return {
    type: "object",
    additionalProperties: false,
    properties: props,
    ...(required.length ? { required } : {}),
  };
}

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

    // Build per-template schemas
    const schemas = {
      ItemBase: {
        type: "object",
        properties: {
          template: { type: "string" },
          id: { type: "string", description: "GUID" },
          filename: { type: "string" },
          title: { type: "string" },
          meta: { type: "object", additionalProperties: true },
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
        required: ["template", "id", "filename"],
      },
    };

    const itemRefs = [];
    const payloadRefs = [];

    for (const [id, desc] of templates) {
      const y = await loadTemplateYaml(desc.filename);
      const guidField = (y?.fields || []).find((f) => f.type === "guid");
      if (!y || y.enable_collection !== true || !guidField) continue;

      enabled.push({ id, yaml: y, guidKey: guidField.key });

      const dataSchemaName = `Data_${id}`;
      const payloadName = `Upsert_${id}`;
      const itemName = `Item_${id}`;

      const dataSchema = makeDataSchema(y);

      schemas[dataSchemaName] = dataSchema;

      schemas[payloadName] = {
        type: "object",
        properties: {
          meta: { type: "object", additionalProperties: true },
          data: { $ref: `#/components/schemas/${dataSchemaName}` },
        },
        required: ["data"],
      };

      schemas[itemName] = {
        allOf: [
          { $ref: "#/components/schemas/ItemBase" },
          {
            type: "object",
            properties: {
              data: { $ref: `#/components/schemas/${dataSchemaName}` },
            },
            required: ["data"],
          },
        ],
      };

      itemRefs.push({ $ref: `#/components/schemas/${itemName}` });
      payloadRefs.push({ $ref: `#/components/schemas/${payloadName}` });
    }

    const spec = {
      openapi: "3.0.3",
      info: {
        title: "Formidable Collections API",
        version: "1.1.0",
        description:
          "CRUD for collection-enabled templates. Request/response schemas are generated from each template's fields.",
      },
      servers: [{ url: baseUrl }],
      components: {
        parameters: {
          TemplateParam: {
            name: "template",
            in: "path",
            required: true,
            schema: { type: "string", enum: enabled.map((t) => t.id) },
            description: "Template id",
          },
          IdParam: {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Item GUID",
          },
        },
        schemas: {
          ...schemas,
          ListResponse: {
            type: "object",
            properties: {
              collectionEnabled: { type: "boolean" },
              template: { type: "string" },
              total: { type: "integer" },
              limit: { type: "integer" },
              offset: { type: "integer" },
              items: { type: "array", items: { oneOf: itemRefs } },
            },
            required: [
              "collectionEnabled",
              "template",
              "total",
              "limit",
              "offset",
              "items",
            ],
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
            summary: "Create new item",
            parameters: [{ $ref: "#/components/parameters/TemplateParam" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    oneOf: payloadRefs,
                    description: "Pick the schema matching the template path.",
                  },
                },
              },
            },
            responses: {
              201: {
                description: "Created",
                content: {
                  "application/json": { schema: { oneOf: itemRefs } },
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
                  "application/json": { schema: { oneOf: itemRefs } },
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
                "application/json": { schema: { oneOf: payloadRefs } },
              },
            },
            responses: {
              200: {
                description: "OK",
                content: {
                  "application/json": { schema: { oneOf: itemRefs } },
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

    return spec;
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
