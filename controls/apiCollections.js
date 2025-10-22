// controls/apiCollections.js

const path = require("path");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const fieldSchema = require("../schemas/field.schema.js");

const {
  getVirtualStructure,
  loadTemplateYaml,
  listCollection,
  resolveFormById,
  isCollectionEnabled,
  statRev,
  collectionRev,
} = require("./serverDataProvider");

const templateManager = require("./templateManager");
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
    case "loopstart":
    case "loopstop":
      // Containers – no stored data value
      return [null, null];
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
    case "api": {
      // Persisted selection + mapped fields.
      const mappedKeys = Array.isArray(f.map)
        ? f.map
            .map((it) =>
              it && typeof it.key === "string" ? it.key.trim() : ""
            )
            .filter(Boolean)
        : [];
      const mappedProps = Object.fromEntries(
        mappedKeys.map((k) => [k, { type: "string" }])
      );
      // Allow two shapes:
      //  - just the selected id (string)
      //  - object with id + mapped values (and allow extras to be forward-compatible)
      const apiSchema = {
        oneOf: [
          { type: "string", description: "Selected item id" },
          {
            type: "object",
            additionalProperties: true,
            properties: { id: { type: "string" }, ...mappedProps },
            required: ["id"],
          },
        ],
        description:
          "API-linked value: either the selected id (string) or an object with `id` plus mapped fields.",
      };
      return [f.key, apiSchema];
    }

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
    const out = fieldToProperty(f);
    if (!out) continue;
    const [k, s] = out;
    if (!k || !s) continue; // skip container/non-storable fields
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

  router.get("/collections/design/:template", async (req, res) => {
    const id = req.params.template;
    const tmpl = `${id}.yaml`;
    const yaml = await loadTemplateYaml(tmpl);
    if (!yaml) return res.status(404).json({ error: "template-not-found" });
    if (!isCollectionEnabled(yaml)) {
      return res.status(403).json({ error: "collection-disabled" });
    }

    const abs = path.join(configManager.getContextTemplatesPath(), tmpl);
    try {
      const { etag, lastModified } = statRev(abs);
      res.setHeader("ETag", etag);
      res.setHeader("Last-Modified", lastModified);
    } catch {}
    res.setHeader("Cache-Control", "no-store");

    const normOptions = (opts) =>
      Array.isArray(opts)
        ? opts.map((o) =>
            typeof o === "object" && o !== null
              ? { value: o.value, label: o.label ?? String(o.value ?? "") }
              : { value: o, label: String(o) }
          )
        : [];

    const fields = (yaml.fields || []).map((raw) => {
      const s = fieldSchema.sanitize(raw);
      s.label = s.label || raw.key || "";
      if (raw.primary_key !== undefined) s.primary_key = !!raw.primary_key;
      s.options = normOptions(raw.options);
      return s;
    });

    res.json({
      name: yaml.name || id,
      filename: tmpl,
      item_field: yaml.item_field || "",
      markdown_template: yaml.markdown_template || "",
      sidebar_expression: yaml.sidebar_expression || "",
      enable_collection: !!yaml.enable_collection,
      fields,
    });
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

    const { limit, offset, q, tags, include } = req.query;
    const out = await listCollection(tmpl, {
      limit: Number(limit) || 100,
      offset: Number(offset) || 0,
      q: q || "",
      tags: tags || "",
      include: (include || "summary").toLowerCase(),
    });

    if (!out.collectionEnabled) {
      return res.status(403).json({ error: "collection-disabled" });
    }

    res.setHeader("ETag", rev.etag);
    res.setHeader("Last-Modified", rev.lastModified);
    res.json(out);
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

    const guidKey = templateManager.getGuidFieldKey(yaml.fields || []);
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

    const exists = await resolveFormById(tmpl, String(guid));
    if (exists.ok) {
      return res
        .status(409)
        .json({ error: "already-exists", id: String(guid) });
    }

    const filename = `${String(guid)}.meta.json`;

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

    const guidKey = templateManager.getGuidFieldKey(yaml.fields || []);
    const id = String(req.params.id);

    const resolved = await resolveFormById(tmpl, id);
    if (!resolved.ok)
      return res
        .status(resolved.code || 404)
        .json({ error: resolved.reason || "not-found" });

    const payload = req.body || {};
    const data = payload.data || {};
    const meta = payload.meta || {};

    if (data?.[guidKey] && String(data[guidKey]) !== id) {
      return res.status(409).json({
        error: "guid-mismatch",
        message: `Payload ${guidKey} must equal path id.`,
      });
    }

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

  router.patch("/collections/:template/:id", async (req, res) => {
    const tmpl = `${req.params.template}.yaml`;
    const yaml = await loadTemplateYaml(tmpl);
    if (!yaml || !isCollectionEnabled(yaml)) {
      return res.status(403).json({ error: "collection-disabled" });
    }

    const id = String(req.params.id);
    const resolved = await resolveFormById(tmpl, id);
    if (!resolved.ok) {
      return res
        .status(resolved.code || 404)
        .json({ error: resolved.reason || "not-found" });
    }

    if (req.headers["if-match"]) {
      const rev = statRev(resolved.absPath);
      if (req.headers["if-match"] !== rev.etag) {
        return res
          .status(412)
          .json({ error: "precondition-failed", expected: rev.etag });
      }
    }

    const guidKey = templateManager.getGuidFieldKey(yaml.fields || []);
    const incoming = req.body || {};
    const incData = incoming.data || undefined;
    const incMeta = incoming.meta || undefined;

    const merged = {
      meta: incMeta
        ? { ...(resolved.form.meta || {}), ...incMeta }
        : resolved.form.meta || {},
      data: incData
        ? { ...(resolved.form.data || {}), ...incData }
        : resolved.form.data || {},
    };

    if (merged.data[guidKey] && String(merged.data[guidKey]) !== id) {
      return res.status(409).json({
        error: "guid-mismatch",
        message: `Payload ${guidKey} must equal path id.`,
      });
    }
    merged.data[guidKey] = id;

    const result = formManager.saveForm(
      tmpl,
      resolved.formFile,
      merged,
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
      meta: merged.meta,
      data: merged.data,
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

  router.patch("/collections/:template/:id/field/:key", async (req, res) => {
    const tmpl = `${req.params.template}.yaml`;
    const yaml = await loadTemplateYaml(tmpl);
    if (!yaml || !isCollectionEnabled(yaml)) {
      return res.status(403).json({ error: "collection-disabled" });
    }

    const id = String(req.params.id);
    const key = String(req.params.key);
    const resolved = await resolveFormById(tmpl, id);
    if (!resolved.ok)
      return res
        .status(resolved.code || 404)
        .json({ error: resolved.reason || "not-found" });

    const guidKey = templateManager.getGuidFieldKey(yaml.fields || []);
    if (key === guidKey)
      return res.status(409).json({ error: "guid-immutable" });

    const fieldDef = (yaml.fields || []).find((f) => f.key === key);
    if (!fieldDef) return res.status(400).json({ error: "unknown-field", key });

    let value =
      req.body && Object.prototype.hasOwnProperty.call(req.body, "value")
        ? req.body.value
        : req.body;

    const merged = {
      meta: resolved.form.meta || {},
      data: { ...(resolved.form.data || {}), [key]: value, [guidKey]: id },
    };

    const result = formManager.saveForm(
      tmpl,
      resolved.formFile,
      merged,
      yaml.fields
    );
    if (!result?.success)
      return res
        .status(500)
        .json({ error: "save-failed", detail: result?.error });

    const rev = statRev(resolved.absPath);
    res.setHeader("ETag", rev.etag);
    res.setHeader("Last-Modified", rev.lastModified);
    res.json({
      template: req.params.template,
      id,
      filename: resolved.formFile,
      changed: { [key]: value },
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

    // ---------- shared + per-template schemas ----------
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

      ItemSummary: {
        type: "object",
        properties: {
          id: { type: "string" },
          filename: { type: "string" },
          title: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          href: { type: "string" },
        },
        required: ["id", "filename", "title"],
      },

      TemplateField: {
        type: "object",
        additionalProperties: true,
        properties: {
          key: { type: "string" },
          type: { type: "string" },
          label: { type: "string" },
          description: { type: "string" },
          expression_item: { type: "boolean" },
          two_column: { type: "boolean" },
          default: {},
          primary_key: { type: "boolean" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: { value: {}, label: { type: "string" } },
            },
          },

          // textarea
          format: { type: "string", enum: ["markdown", "plain"] },

          // ✅ latex
          rows: {
            type: "integer",
            minimum: 2,
            maximum: 60,
            description: "Visible line count",
          },
          use_fenced: {
            type: "boolean",
            description: "Wrap with fenced block by default",
          },
          placeholder: { type: "string", description: "UI hint text" },

          // code
          run_mode: { type: "string", enum: ["manual", "load", "save"] },
          allow_run: { type: "boolean" },
          input_mode: { type: "string", enum: ["safe", "raw"] },
          api_mode: { type: "string", enum: ["frozen", "raw"] },
          api_pick: { type: "array", items: { type: "string" } },

          // api
          collection: { type: "string" },
          id: { type: "string" },
          map: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                path: { type: "string" },
                mode: { type: "string", enum: ["static", "editable"] },
              },
              required: ["key", "path", "mode"],
            },
          },
          use_picker: { type: "boolean" },
          allowed_ids: { type: "array", items: { type: "string" } },
        },
        required: ["key", "type", "label"],
      },

      TemplateDesign: {
        type: "object",
        properties: {
          name: { type: "string" },
          filename: { type: "string" },
          item_field: { type: "string" },
          markdown_template: { type: "string" },
          sidebar_expression: { type: "string" },
          enable_collection: { type: "boolean" },
          fields: {
            type: "array",
            items: { $ref: "#/components/schemas/TemplateField" },
          },
        },
        required: ["name", "filename", "enable_collection", "fields"],
      },

      CountResponse: {
        type: "object",
        properties: {
          template: { type: "string" },
          total: { type: "integer" },
        },
        required: ["template", "total"],
      },

      FieldPatchBody: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["value"],
            properties: { value: {} },
          },
          { type: "string" },
          { type: "number" },
          { type: "boolean" },
          { type: "array", items: {} },
          { type: "object" },
        ],
        description: "Either `{ value: ... }` or a raw JSON value.",
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
            items: { $ref: "#/components/schemas/ItemSummary" },
          },
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

      ListResponseFull: {
        type: "object",
        properties: {
          collectionEnabled: { type: "boolean" },
          template: { type: "string" },
          total: { type: "integer" },
          limit: { type: "integer" },
          offset: { type: "integer" },
          items: { type: "array", items: { oneOf: [] } }, // fill later with itemRefs
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
    };

    const itemRefs = [];
    const payloadRefs = [];
    const partialPayloadRefs = [];

    for (const [id, desc] of templates) {
      const y = await loadTemplateYaml(desc.filename);
      const guidKey = templateManager.getGuidFieldKey(y?.fields || []);
      if (!y || y.enable_collection !== true || !guidKey) continue;

      enabled.push({ id, yaml: y, guidKey });

      const dataSchemaName = `Data_${id}`;
      const payloadName = `Upsert_${id}`;
      const partialName = `UpsertPartial_${id}`;
      const itemName = `Item_${id}`;

      const dataSchema = makeDataSchema(y);

      // table override: array-of-arrays in stored JSON
      for (const f of y.fields || []) {
        if (f.type === "table" && dataSchema.properties?.[f.key]) {
          const cols = (f.options || []).map((o) => String(o.value));
          dataSchema.properties[f.key] = {
            type: "array",
            description: "Array of rows; each row is an array of cell values",
            items: {
              type: "array",
              items: { type: "string" },
              ...(cols.length
                ? { minItems: cols.length, maxItems: cols.length }
                : {}),
            },
          };
        }
      }

      schemas[dataSchemaName] = dataSchema;

      schemas[payloadName] = {
        type: "object",
        properties: {
          meta: { type: "object", additionalProperties: true },
          data: { $ref: `#/components/schemas/${dataSchemaName}` },
        },
        required: ["data"],
      };

      schemas[partialName] = {
        type: "object",
        properties: {
          meta: { type: "object", additionalProperties: true },
          data: {
            type: "object",
            additionalProperties: true,
            properties: dataSchema.properties || {},
          },
        },
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
      partialPayloadRefs.push({ $ref: `#/components/schemas/${partialName}` });
    }

    // plug dynamic item refs into ListResponseFull
    schemas.ListResponseFull.properties.items.items.oneOf = itemRefs;

    return {
      openapi: "3.0.3",
      info: {
        title: "Formidable Collections API",
        version: "1.5.0",
        description:
          "CRUD for collection-enabled templates. Schemas are generated from template fields. Use `include` to control list payload size.",
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
          KeyParam: {
            name: "key",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Field key within the template",
          },
        },
        schemas,
      },
      paths: {
        "/collections": {
          get: {
            summary: "List collection-enabled templates",
            responses: { 200: { description: "OK" } },
          },
        },

        "/collections/design/{template}": {
          get: {
            summary:
              "Get template design (labels, descriptions, options, markdown)",
            parameters: [{ $ref: "#/components/parameters/TemplateParam" }],
            responses: {
              200: {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/TemplateDesign" },
                  },
                },
              },
              403: { description: "collection-disabled" },
              404: { description: "template-not-found" },
            },
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
              {
                name: "include",
                in: "query",
                description:
                  "Controls payload size: `summary` (default) | `data` | `meta` | `all`",
                schema: {
                  type: "string",
                  enum: ["summary", "data", "meta", "all"],
                  default: "summary",
                },
              },
            ],
            responses: {
              200: {
                description: "OK",
                content: {
                  "application/json": {
                    schema: {
                      oneOf: [
                        { $ref: "#/components/schemas/ListResponse" },
                        { $ref: "#/components/schemas/ListResponseFull" },
                      ],
                    },
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
                "application/json": { schema: { oneOf: payloadRefs } },
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

        "/collections/{template}/count": {
          get: {
            summary: "Count items in a collection",
            parameters: [{ $ref: "#/components/parameters/TemplateParam" }],
            responses: {
              200: {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/CountResponse" },
                  },
                },
              },
              403: { description: "collection-disabled" },
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
          patch: {
            summary: "Merge update (partial) by GUID",
            parameters: [
              { $ref: "#/components/parameters/TemplateParam" },
              { $ref: "#/components/parameters/IdParam" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": { schema: { oneOf: partialPayloadRefs } },
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
              412: {
                description: "precondition-failed (If-Match ETag mismatch)",
              },
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

        "/collections/{template}/{id}/field/{key}": {
          patch: {
            summary: "Update a single field by key",
            parameters: [
              { $ref: "#/components/parameters/TemplateParam" },
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/KeyParam" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/FieldPatchBody" },
                },
              },
            },
            responses: {
              200: {
                description: "OK",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        template: { type: "string" },
                        id: { type: "string" },
                        filename: { type: "string" },
                        changed: { type: "object", additionalProperties: true },
                        rev: {
                          type: "object",
                          properties: {
                            etag: { type: "string" },
                            lastModified: { type: "string" },
                          },
                        },
                      },
                      required: ["template", "id", "filename", "changed"],
                    },
                  },
                },
              },
              400: { description: "unknown-field" },
              403: { description: "collection-disabled" },
              404: { description: "not-found" },
              409: { description: "guid-immutable" },
            },
          },
        },

        "/collections/{template}/export.ndjson": {
          get: {
            summary: "Export entire collection as NDJSON (stream)",
            parameters: [{ $ref: "#/components/parameters/TemplateParam" }],
            responses: {
              200: {
                description: "OK",
                headers: {
                  "Content-Type": {
                    schema: {
                      type: "string",
                      example: "application/x-ndjson; charset=utf-8",
                    },
                  },
                },
              },
              403: { description: "collection-disabled" },
            },
          },
        },

        "/collections/{template}/export.csv": {
          get: {
            summary: "Export collection summary as CSV",
            parameters: [{ $ref: "#/components/parameters/TemplateParam" }],
            responses: {
              200: {
                description: "OK",
                headers: {
                  "Content-Type": {
                    schema: {
                      type: "string",
                      example: "text/csv; charset=utf-8",
                    },
                  },
                  "Content-Disposition": {
                    schema: {
                      type: "string",
                      example: 'attachment; filename="<template>-export.csv"',
                    },
                  },
                },
              },
              403: { description: "collection-disabled" },
            },
          },
        },
      },
    };
  }

  router.get("/openapi.json", async (req, res) => {
    const spec = await buildOpenApiSpec("/api");
    res.json(spec);
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      explorer: false,
      swaggerOptions: { url: "/api/openapi.json" },
      customSiteTitle: "Formidable Collections API",
      customfavIcon: "/assets/formidable.ico",
      customJs: "/assets/internal-server/js/swagger-back.js",
      customCss: `
        /* keep the topbar as a flex row */
        .swagger-ui .topbar .wrapper{display:flex;align-items:center;gap:.5rem;}

        /* make OUR link small and ignore Swagger's button styles */
        .swagger-ui .topbar .wrapper a.fm-docs-back{
          all: unset;                        /* wipe inherited Swagger button styles */
          margin-left: auto;                 /* push to the right */
          display: inline-flex; align-items: center; gap: .35rem;
          font: 600 12px/1.15 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif !important;
          padding: .28rem .6rem !important;  /* tiny */
          border-radius: 9999px !important;
          border: 1px solid #dbe5ff !important;
          background: #f7faff !important;
          color: #2a62e0 !important;
          text-decoration: none !important;
          cursor: pointer;
        }
        .swagger-ui .topbar .wrapper a.fm-docs-back:hover{
          background:#eff5ff !important; border-color:#c9d8ff !important;
        }
    `,
    })
  );

  app.use("/api", router);
}

module.exports = { mountApiCollections };
