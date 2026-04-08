// utils/templateGenerator.js

export function generateTemplateCode(fields = []) {
  if (!Array.isArray(fields) || fields.length === 0) return "";

  const frontmatter = [
    "---",
    "title: Auto-generated Report",
    "author: Formidable Generator",
    `date: ${new Date().toISOString().split("T")[0]}`,
    "toc: true",
    "toc-title: Contents",
    "toc-own-page: true",
    "---",
    "",
  ].join("\n");

  const topLevelLogs = [];
  const body = renderFieldBlocks(fields, 2, topLevelLogs);
  const content = body.join("\n---\n\n");
  const logSection = buildLogSection(topLevelLogs);

  return frontmatter + "\n" + content + logSection;
}

function renderFieldBlocks(fields, headingLevel = 2, logs = []) {
  const result = [];
  const seenKeys = new Set();

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const key = field.key || "unknown";
    const type = (field.type || "text").toLowerCase();

    if (type === "loopstart") {
      const loopKey = key;
      const innerFields = [];
      let depth = 1;

      i++;
      while (i < fields.length && depth > 0) {
        const f = fields[i];
        const t = (f.type || "").toLowerCase();
        if (t === "loopstart") depth++;
        else if (t === "loopstop") depth--;

        if (depth > 0) innerFields.push(f);
        i++;
      }
      i--; // correct overshoot

      // Add synthetic index field for the loop
      const indexField = {
        key: `${loopKey}_index`,
        label: `${loopKey} index`,
        type: "number",
        description: `Auto-generated index for loop "${loopKey}"`,
      };
      innerFields.unshift(indexField);

      // Loop fields get their own log collector (scoped inside the loop)
      const loopLogs = [];
      const loopContent = renderFieldBlocks(
        innerFields,
        headingLevel + 1,
        loopLogs
      ).join("\n---\n\n");

      const loopLogBlock = buildLogSection(loopLogs);

      result.push(
        `\n${"#".repeat(
          headingLevel
        )} Loop: ${loopKey}\n\n{{#loop "${loopKey}"}}\n${loopContent}${loopLogBlock}\n{{/loop}}\n`
      );

      seenKeys.add(`${loopKey}_index`);
    } else if (type !== "loopstop" && !seenKeys.has(key)) {
      result.push(generateSingleFieldBlock(field, headingLevel, logs));
      seenKeys.add(key);
    }
  }

  return result;
}

function generateSingleFieldBlock(field, headingLevel = 2, logs = []) {
  const key = field.key || "unknown";
  const label = field.label || key;
  const type = (field.type || "text").toLowerCase();

  collectLogs(logs, key, type);

  const heading = "#".repeat(headingLevel);
  const header = `${heading} ${label}\n\n_{{fieldDescription "${key}"}}_\n`;

  const block = (() => {
    switch (type) {
      case "checkbox":
        return `{{#if (fieldRaw "${key}")}}\n✅ ${label} is checked\n{{else}}\n❌ ${label} is not checked\n{{/if}}`;

      case "radio":
      case "dropdown":
        return `Selected: {{field "${key}"}}\n(Value: {{field "${key}" "value"}})`;

      case "multioption":
        return `- Labels:\n{{#each (fieldRaw "${key}") as |val idx|}}\n  {{#with (lookupOption (fieldMeta "${key}" "options") val) as |opt|}}\n    {{opt.label}}{{#unless (eq idx (subtract (length (fieldRaw "${key}")) 1))}}, {{/unless}}\n  {{/with}}\n{{/each}}\n\n- Values: {{fieldRaw "${key}"}}\n\n- All Options:\n{{#with (fieldRaw "${key}") as |selected|}}\n  {{#each (fieldMeta "${key}" "options") as |opt|}}\n  - [{{#if (includes selected opt.value)}}x{{else}} {{/if}}] {{opt.label}}\n  {{/each}}\n{{/with}}`;

      case "tags":
        return `{{#if (fieldRaw "${key}")}}\nTags(regular): {{field "${key}"}}\nTags(with #): {{tags (fieldRaw "${key}") withHash=true}}\nTags(without #): {{tags (fieldRaw "${key}") withHash=false}}\n{{else}}\n_No tags specified_\n{{/if}}`;

      case "list":
        return `{{#each (fieldRaw "${key}")}}\n- {{this}}\n{{/each}}`;

      case "table":
        return `{{#if (fieldRaw "${key}")}}

<!-- Column Values -->
  {{#with (fieldMeta "${key}" "options") as |headers|}}
|{{#each headers}}{{value}} |{{/each}}
|{{#each headers}}--|{{/each}}
  {{/with}}
  {{#each (fieldRaw "${key}")}}
|{{#each this}}{{this}} |{{/each}}
  {{/each}}

<!-- Column Labels -->
  {{#with (fieldMeta "${key}" "options") as |headers|}}
|{{#each headers}}{{label}}{{^label}}{{value}}{{/label}} |{{/each}}
|{{#each headers}}--|{{/each}}
  {{/with}}
  {{#each (fieldRaw "${key}")}}
|{{#each this}}{{this}} |{{/each}}
  {{/each}}

{{/if}}`;

      case "image":
        return `{{#if (fieldRaw "${key}")}}\n![${label}]({{field "${key}"}})\n{{else}}\n_No image uploaded for ${label}_\n{{/if}}`;

      default:
        return `{{field "${key}"}}`;
    }
  })();

  return `${header}\n${block}`;
}

function collectLogs(logs, key, type) {
  logs.push(`> **${key}**: \`{{json (fieldRaw "${key}")}}\``);
  if (["dropdown", "radio", "multioption", "table"].includes(type)) {
    logs.push(`> **${key}** _(options)_: \`{{json (fieldMeta "${key}" "options")}}\``);
  }
}

function buildLogSection(logs) {
  if (logs.length === 0) return "";
  return [
    "",
    "",
    "---",
    "",
    "> _Debug: Remove this section when your template is complete._",
    ">",
    ...logs.map((line) => line),
    "",
  ].join("\n");
}
