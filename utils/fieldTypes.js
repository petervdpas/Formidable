// modules/fieldTypes.js

import * as parsers from "./fieldParsers.js";
import * as renderers from "./fieldRenderers.js";
import * as appliers from "./fieldAppliers.js";
import { generateGuid } from "./domUtils.js";

export const fieldTypes = {
  guid: {
    type: "guid",
    label: "Guid",
    cssClass: { main: "modal-guid" },
    selectorAttr: "data-guid-field",
    disabledAttributes: [
      "primaryKeyRow",
      "label",
      "description",
      "default",
      "options",
      "twoColumnRow",
      "sidebarItemRow",
    ],
    defaultValue: () => generateGuid(),
    renderInput: renderers.renderGuidField,
    parseValue: parsers.parseGuidField,
    applyValue: appliers.applyGuidField,
  },

  looper: {
    label: "Looper",
    metaOnly: true,
    cssClass: { main: "modal-looper" },
    disabledAttributes: [
      //"description",
      "default",
      "options",
      "twoColumnRow",
      "sidebarItemRow",
    ],
  },

  loopstart: {
    label: "Loop Start",
    metaOnly: true,
    cssClass: {
      main: "modal-loopstart",
    },
    disabledAttributes: [
      //"description",
      "default",
      "options",
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
    cssClass: { main: "modal-loopstop" },
    disabledAttributes: [
      "description",
      "default",
      "options",
      "twoColumnRow",
      "sidebarItemRow",
    ],
    defaultValue: () => "",
    renderInput: renderers.renderLoopstopField,
    parseValue: () => null,
  },

  text: {
    label: "Text",
    cssClass: { main: "modal-text" },
    selectorAttr: "data-text-field",
    disabledAttributes: [],
    defaultValue: () => "",
    renderInput: renderers.renderTextField,
    parseValue: parsers.parseTextField,
    applyValue: appliers.applyGenericField,
  },

  boolean: {
    label: "Checkbox",
    cssClass: { main: "modal-boolean" },
    selectorAttr: "data-boolean-field",
    disabledAttributes: [],
    defaultValue: () => false,
    renderInput: renderers.renderBooleanField,
    parseValue: parsers.parseBooleanField,
    applyValue: appliers.applyGenericField,
  },

  dropdown: {
    label: "Dropdown",
    cssClass: { main: "modal-dropdown" },
    selectorAttr: "data-dropdown-field",
    disabledAttributes: [],
    defaultValue: () => "",
    renderInput: renderers.renderDropdownField,
    parseValue: parsers.parseDropdownField,
    applyValue: appliers.applyGenericField,
  },

  multioption: {
    label: "Multiple Choice",
    cssClass: { main: "modal-multioption" },
    selectorAttr: "data-multioption-field",
    disabledAttributes: [],
    defaultValue: () => [],
    renderInput: renderers.renderMultioptionField,
    parseValue: parsers.parseMultiOptionField,
    applyValue: appliers.applyMultioptionField,
  },

  radio: {
    label: "Radio Buttons",
    cssClass: { main: "modal-radio" },
    selectorAttr: "data-radio-field",
    disabledAttributes: [],
    defaultValue: () => "",
    renderInput: renderers.renderRadioField,
    parseValue: parsers.parseRadioField,
    applyValue: appliers.applyGenericField,
  },

  textarea: {
    label: "Multiline Text",
    cssClass: { main: "modal-textarea" },
    selectorAttr: "data-textarea-field",
    disabledAttributes: [],
    defaultValue: () => "",
    renderInput: renderers.renderTextareaField,
    parseValue: parsers.parseTextareaField,
    applyValue: appliers.applyGenericField,
  },

  number: {
    label: "Number",
    cssClass: { main: "modal-number" },
    selectorAttr: "data-number-field",
    disabledAttributes: [],
    defaultValue: () => 0,
    renderInput: renderers.renderNumberField,
    parseValue: parsers.parseNumberField,
    applyValue: appliers.applyGenericField,
  },

  range: {
    label: "Range Slider",
    cssClass: { main: "modal-range" },
    selectorAttr: "data-range-field",
    disabledAttributes: [],
    defaultValue: () => 50,
    renderInput: renderers.renderRangeField,
    parseValue: parsers.parseRangeField,
    applyValue: appliers.applyRangeField,
  },

  date: {
    label: "Date",
    cssClass: { main: "modal-date" },
    selectorAttr: "data-date-field",
    disabledAttributes: [],
    defaultValue: () => "",
    renderInput: renderers.renderDateField,
    parseValue: parsers.parseDateField,
    applyValue: appliers.applyGenericField,
  },

  list: {
    label: "List",
    cssClass: { main: "modal-list" },
    selectorAttr: "data-list-field",
    disabledAttributes: [],
    defaultValue: () => [],
    renderInput: renderers.renderListField,
    parseValue: parsers.parseListField,
    applyValue: appliers.applyListField,
  },

  table: {
    label: "Table",
    cssClass: { main: "modal-table" },
    selectorAttr: "data-table-field",
    disabledAttributes: [],
    defaultValue: () => [],
    renderInput: renderers.renderTableField,
    parseValue: parsers.parseTableField,
    applyValue: appliers.applyTableField,
  },

  image: {
    label: "Image Upload",
    cssClass: { main: "modal-image" },
    selectorAttr: "data-image-field",
    disabledAttributes: [],
    defaultValue: () => "",
    renderInput: renderers.renderImageField,
    parseValue: parsers.parseImageField,
    applyValue: appliers.applyImageField,
  },

  link: {
    label: "Link",
    cssClass: { main: "modal-link" },
    selectorAttr: "data-link-field",
    disabledAttributes: [],
    defaultValue: () => "",
    renderInput: renderers.renderLinkField,
    parseValue: parsers.parseLinkField,
    applyValue: appliers.applyLinkField,
  },

  tags: {
    label: "Tags",
    cssClass: { main: "modal-tags" },
    selectorAttr: "data-tags-field",
    disabledAttributes: [],
    defaultValue: () => [],
    renderInput: renderers.renderTagsField,
    parseValue: parsers.parseTagsField,
    applyValue: appliers.applyGenericField,
  },
};
