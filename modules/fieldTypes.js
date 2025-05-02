// modules/fieldTypes.js

export const fieldTypes = {
  text: {
    label: "Text",
    cssClass: "modal-text",
    defaultValue: () => "",
    defaultMarkdownHint: "p",
    renderInput(field) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = field.default || "";
      input.name = field.key;
      return input;
    },
    parseValue(input) {
      return input.value.trim();
    },
  },

  boolean: {
    label: "Checkbox",
    cssClass: "modal-boolean",
    defaultValue: () => false,
    defaultMarkdownHint: "checkbox",
    renderInput(field) {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = field.default === true;
      input.name = field.key;
      return input;
    },
    parseValue(input) {
      return input.checked;
    },
  },

  dropdown: {
    label: "Dropdown",
    cssClass: "modal-dropdown",
    defaultValue: () => "",
    defaultMarkdownHint: "p",
    renderInput(field) {
      const select = document.createElement("select");
      (field.options || []).forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
      select.value = field.default || "";
      select.name = field.key;
      return select;
    },
    parseValue(input) {
      return input.value;
    },
  },

  radio: {
    label: "Radio Buttons",
    cssClass: "modal-radio",
    defaultValue: () => "",
    defaultMarkdownHint: "p",
    renderInput(field) {
      const wrapper = document.createElement("div");
      (field.options || []).forEach((opt) => {
        const label = document.createElement("label");
        label.style.display = "block";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = field.key;
        input.value = opt;
        if (opt === field.default) {
          input.checked = true;
        }

        label.appendChild(input);
        label.appendChild(document.createTextNode(` ${opt}`));
        wrapper.appendChild(label);
      });
      wrapper.dataset.radioGroup = field.key;
      return wrapper;
    },
    parseValue(wrapper) {
      const group = wrapper.querySelector(
        `input[name="${wrapper.dataset.radioGroup}"]:checked`
      );
      return group?.value || "";
    },
  },

  textarea: {
    label: "Multiline Text",
    cssClass: "modal-textarea",
    defaultValue: () => "",
    defaultMarkdownHint: "p",
    renderInput(field) {
      const textarea = document.createElement("textarea");
      textarea.value = field.default || "";
      textarea.name = field.key;
      return textarea;
    },
    parseValue(input) {
      return input.value.trim();
    },
  },

  number: {
    label: "Number",
    cssClass: "modal-number",
    defaultValue: () => 0,
    defaultMarkdownHint: "p",
    renderInput(field) {
      const input = document.createElement("input");
      input.type = "number";
      input.value = field.default ?? 0;
      input.name = field.key;
      return input;
    },
    parseValue(input) {
      return parseFloat(input.value) || 0;
    },
  },

  date: {
    label: "Date",
    cssClass: "modal-date",
    defaultValue: () => "",
    defaultMarkdownHint: "p",
    renderInput(field) {
      const input = document.createElement("input");
      input.type = "date";
      input.value = field.default || "";
      input.name = field.key;
      return input;
    },
    parseValue(input) {
      return input.value;
    },
  },

  list: {
    label: "List (Comma Separated)",
    cssClass: "modal-list",
    defaultValue: () => [],
    defaultMarkdownHint: "list",
    renderInput(field) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = (field.default || []).join(", ");
      input.name = field.key;
      input.placeholder = "e.g., item1, item2, item3";
      return input;
    },
    parseValue(input) {
      return input.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    },
  },

  table: {
    label: "Table (JSON Input)",
    cssClass: "modal-table",
    defaultValue: () => [],
    defaultMarkdownHint: "table",
    renderInput(field) {
      const textarea = document.createElement("textarea");
      textarea.name = field.key;
      textarea.rows = 5;
      try {
        textarea.value = JSON.stringify(field.default || [], null, 2);
      } catch {
        textarea.value = "[]";
      }
      return textarea;
    },
    parseValue(input) {
      try {
        return JSON.parse(input.value);
      } catch {
        return [];
      }
    },
  },
};
