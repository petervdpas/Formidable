// utils/templateGenerator.js

export function generateTemplateCode(fields = []) {
  if (!Array.isArray(fields) || fields.length === 0) return "";

  const headerComment = `<!-- AUTO-GENERATED TEMPLATE - Only if Editor is empty! -->\n`;

  const bodyParts = [];
  const seenKeys = new Set();
  let i = 0;

  while (i < fields.length) {
    const field = fields[i];
    const key = field.key || "unknown";
    const type = (field.type || "text").toLowerCase();

    if (type === "loopstart") {
      const loopKey = key;
      const loopFields = [];
      i++;

      while (i < fields.length && fields[i].type !== "loopstop") {
        loopFields.push(fields[i]);
        i++;
      }

      const loopContent = [
        `### LoopIndex: {{loop_index.value}}\n`,
        ...loopFields.map((f) => generateSingleFieldBlock(f, 3)),
      ].join("\n---\n\n");

      bodyParts.push(
        `\n## Loop: ${loopKey}\n\n{{#loop "${loopKey}"}}\n${loopContent}\n{{/loop}}\n`
      );
    } else if (type !== "loopstop" && !seenKeys.has(key)) {
      bodyParts.push(generateSingleFieldBlock(field)); // defaults to H2
    }

    seenKeys.add(key);
    i++;
  }

  return headerComment + bodyParts.join("\n---\n\n");
}

function generateSingleFieldBlock(field, headingLevel = 2) {
  const key = field.key || "unknown";
  const label = field.label || key;
  const type = (field.type || "text").toLowerCase();

  const heading = "#".repeat(headingLevel);
  const logs = ["```sh", `[LOG]\n{{json (fieldRaw "${key}")}}`, "```"];
  if (["dropdown", "radio", "multioption", "table"].includes(type)) {
    logs.push("```sh", `[LOG]\n{{json (fieldMeta "${key}" "options")}}`, "```");
  }

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

  return `${header}\n${logs.join("\n")}\n${block}`;
}
