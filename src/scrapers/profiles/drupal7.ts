import { SelectorProfile } from "../../core/contracts/site-config.js";

/**
 * Drupal 7 "Views" layout - the pattern used by Sainamaina Municipality.
 * Listing rows live in `.view-content .views-row`, metadata in `views-field-*`
 * elements, and "read more" links are `li.node-readmore a`.
 */
export const drupal7: SelectorProfile = {
  stack: "drupal7",
  entities: {
    report: {
      rows: ".view-content .views-row",
      titleLink: ".views-field-title a",
      dateField: ".views-field-created .field-content",
      fileLink: ".views-field-field-documents a",
      detailDocs:
        ".field-name-field-supporting-documents a, .field-type-file a, .file a",
      bodyField: ".field-name-body .field-item",
      titleFallbacks: [
        { selector: "h3.section-title span" },
        { selector: 'span[property="dc:title"]', attribute: "content" },
        { selector: "h1" },
      ],
      titleUsesType: true,
      defaultRowTitle: "शीर्षक उपलब्ध छैन",
      defaultDetailTitle: "",
      fallbackWhen: "emptyResult",
    },
    project: {
      rows: ".introduction .views-row",
      titleLink: ".views-field-title a",
      dateField: null,
      fileLink: ".views-field-field-documents a",
      detailDocs:
        ".field-name-field-supporting-documents a, .field-type-file a, .file a",
      bodyField: ".field-name-body .field-item",
      titleFallbacks: [
        { selector: "h3.section-title span" },
        { selector: 'span[property="dc:title"]', attribute: "content" },
        { selector: "h3.section-title" },
        { selector: "h1" },
      ],
      titleUsesType: false,
      defaultRowTitle: "शीर्षक उपलब्ध छैन",
      defaultDetailTitle: "शीर्षक उपलब्ध छैन",
      fallbackWhen: "emptyRows",
    },
    notice: {
      rows: ".view-content:eq(1) .views-row",
      titleLink: ".views-field-title a",
      dateField: ".views-field-created .field-content",
      fileLink: ".views-field-field-documents a",
      detailDocs:
        ".field-name-field-supporting-documents a, .field-type-file a, .file a",
      bodyField: ".field-name-body .field-item",
      titleFallbacks: [
        { selector: "span[property='dc:title']", attribute: "content" },
        { selector: "h3.section-title span" },
        { selector: "h1" },
      ],
      titleUsesType: false,
      defaultRowTitle: "",
      defaultDetailTitle: "",
      fallbackWhen: "emptyRows",
    },
  },
};