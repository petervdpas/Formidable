// utils/templateGenerator.js

export function generateTemplateCode(fields = []) {
  if (!Array.isArray(fields) || fields.length === 0) return "";

  const headerComment = `<!-- AUTO-GENERATED TEMPLATE - Only if Editor is empty! -->\n`;

  const body = fields
    .map((field) => {
      const key = field.key || "unknown";
      const label = field.label || key;
      const type = (field.type || "text").toLowerCase();

      // Logs wrapped in ```sh blocks
      const logs = ["```sh", `[LOG]\n{{json (fieldRaw "${key}")}}`, "```\n"];
      if (["dropdown", "radio", "multioption", "table"].includes(type)) {
        logs.push(
          "```sh",
          `[LOG]\n{{json (fieldMeta "${key}" "options")}}`,
          "```\n"
        );
      }

      const header = `### ${label}\n\n_{{fieldDescription "${key}"}}_\n`;
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

          default:
            return `{{field "${key}"}}`;
        }
      })();

      return `${header}\n${logs.join("\n")}\n${block}\n`;
    })
    .join("\n---\n\n");

  return headerComment + body;
}
