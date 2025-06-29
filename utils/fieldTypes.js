// modules/fieldTypes.js

import * as parsers from "./fieldParsers.js";
import * as renderers from "./fieldRenderers.js";
import { generateGuid } from "./domUtils.js";


export const fieldTypes = {
  guid: {
    type: "guid",
    label: "Guid",
    cssClass: { main: "modal-guid", construct: false },
    selectorAttr: "data-guid-field",
    constructEnabled: false,
    disabledAttributes: [
      "primaryKeyRow",
      "label",
      "description",
      "default",
      "options",
      "constructFieldsRow",
      "twoColumnRow",
      "sidebarItemRow",
    ],
    defaultValue: () => generateGuid(),
    renderInput: renderers.renderGuidField,
    parseValue: parsers.parseGuidField,
  },

  looper: {
    label: "Looper",
    metaOnly: true,
    cssClass: { main: "modal-looper", construct: "construct-type-looper" },
    constructEnabled: true,
    disabledAttributes: [
      "description",
      "default",
      "options",
      "constructFieldsRow",
      "twoColumnRow",
      "sidebarItemRow",
    ],
  },

  loopstart: {
    label: "Loop Start",
    metaOnly: true,
    cssClass: {
      main: "modal-loopstart",
      construct: "construct-type-loopstart",
    },
    constructEnabled: true,
    disabledAttributes: [
      "description",
      "default",
      "options",
      "constructFieldsRow",
      "twoColumnRow",
      "sidebarItemRow",
    ],
    defaultValue: () => "",
    renderInput: renderers.renderLoopstartField,
    parseValue: () => null, // Not a real input
  },

  loopstop: {
    label: "Loop Stop",
    metaOnly: true,
    cssClass: { main: "modal-loopstop", construct: "construct-type-loopstop" },
    constructEnabled: true,
    disabledAttributes: [
      "description",
      "default",
      "options",
      "constructFieldsRow",
      "twoColumnRow",
      "sidebarItemRow",
    ],
    defaultValue: () => "",
    renderInput: renderers.renderLoopstopField,
    parseValue: () => null,
  },

  construct: {
    label: "Construct",
    cssClass: { main: "modal-construct", construct: false },
    selectorAttr: "data-construct-key",
    constructEnabled: false,
    disabledAttributes: ["default", "twoColumnRow", "sidebarItemRow"],
    defaultValue: () => ({}), // Changed to an object
    renderInput: renderers.renderConstructField,
    parseValue: parsers.parseConstructField,
  },

  text: {
    label: "Text",
    cssClass: { main: "modal-text", construct: "construct-type-text" },
    selectorAttr: "data-text-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => "",
    renderInput: renderers.renderTextField,
    parseValue: parsers.parseTextField,
  },

  boolean: {
    label: "Checkbox",
    cssClass: { main: "modal-boolean", construct: "construct-type-boolean" },
    selectorAttr: "data-boolean-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => false,
    renderInput: renderers.renderBooleanField,
    parseValue: parsers.parseBooleanField,
  },

  dropdown: {
    label: "Dropdown",
    cssClass: { main: "modal-dropdown", construct: "construct-type-dropdown" },
    selectorAttr: "data-dropdown-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => "",
    renderInput:  renderers.renderDropdownField,
    parseValue: parsers.parseDropdownField,
  },

  multioption: {
    label: "Multiple Choice",
    cssClass: {
      main: "modal-multioption",
      construct: "construct-type-multioption",
    },
    selectorAttr: "data-multioption-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => [],
    renderInput: renderers.renderMultioptionField,
    parseValue: parsers.parseMultiOptionField,
  },

  radio: {
    label: "Radio Buttons",
    cssClass: { main: "modal-radio", construct: "construct-type-radio" },
    selectorAttr: "data-radio-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => "",
    renderInput: renderers.renderRadioField,
    parseValue: parsers.parseRadioField,
  },

  textarea: {
    label: "Multiline Text",
    cssClass: { main: "modal-textarea", construct: "construct-type-textarea" },
    selectorAttr: "data-textarea-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => "",
    renderInput: renderers.renderTextareaField,
    parseValue: parsers.parseTextareaField,
  },

  number: {
    label: "Number",
    cssClass: { main: "modal-number", construct: "construct-type-number" },
    selectorAttr: "data-number-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => 0,
    renderInput: renderers.renderNumberField,
    parseValue: parsers.parseNumberField,
  },

  range: {
    label: "Range Slider",
    cssClass: { main: "modal-range", construct: "construct-type-range" },
    selectorAttr: "data-range-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => 50,
    renderInput: renderers.renderRangeField,
    parseValue: parsers.parseRangeField,
  },

  date: {
    label: "Date",
    cssClass: { main: "modal-date", construct: "construct-type-date" },
    selectorAttr: "data-date-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => "",
    renderInput: renderers.renderDateField,
    parseValue: parsers.parseDateField,
  },

  list: {
    label: "List",
    cssClass: { main: "modal-list", construct: "construct-type-list" },
    selectorAttr: "data-list-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => [],
    renderInput: renderers.renderListField,
    parseValue: parsers.parseListField,
  },

  table: {
    label: "Table",
    cssClass: { main: "modal-table", construct: "construct-type-table" },
    selectorAttr: "data-table-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => [],
    renderInput: renderers.renderTableField,
    parseValue: parsers.parseTableField,
  },

  image: {
    label: "Image Upload",
    cssClass: { main: "modal-image", construct: "construct-type-image" },
    selectorAttr: "data-image-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => "",
    renderInput: renderers.renderImageField,
    parseValue: parsers.parseImageField,
  },

  link: {
    label: "Link",
    cssClass: { main: "modal-link", construct: "construct-type-link" },
    selectorAttr: "data-link-field",
    constructEnabled: true,
    disabledAttributes: ["constructFieldsRow"],
    defaultValue: () => "",
    renderInput: renderers.renderLinkField,
    parseValue: parsers.parseLinkField,
  },
};
