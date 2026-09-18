import { SelectorProfile } from "../../core/contracts/site-config.js";

/**
 * WordPress theme layout. W.I.P. starting point - refine per site through
 * entity selector overrides until the common patterns firm up.
 */
export const wordpress: SelectorProfile = {
  stack: "wordpress",
  entities: {
    report: {
      rows: ".post, article, .hentry",
      titleLink: ".entry-title a, h2 a",
      dateField: ".entry-date, time, .posted-on",
      fileLink: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      detailDocs: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      bodyField: ".entry-content, .post-content, .field-name-body .field-item",
      titleFallbacks: [{ selector: ".entry-title" }, { selector: "h1" }],
      titleUsesType: false,
      defaultRowTitle: "शीर्षक उपलब्ध छैन",
      defaultDetailTitle: "शीर्षक उपलब्ध छैन",
      fallbackWhen: "emptyRows",
    },
    project: {
      rows: ".post, article, .hentry",
      titleLink: ".entry-title a, h2 a",
      dateField: null,
      fileLink: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      detailDocs: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      bodyField: ".entry-content, .post-content, .field-name-body .field-item",
      titleFallbacks: [{ selector: ".entry-title" }, { selector: "h1" }],
      titleUsesType: false,
      defaultRowTitle: "शीर्षक उपलब्ध छैन",
      defaultDetailTitle: "शीर्षक उपलब्ध छैन",
      fallbackWhen: "emptyRows",
    },
    notice: {
      rows: ".post, article, .hentry",
      titleLink: ".entry-title a, h2 a",
      dateField: ".entry-date, time, .posted-on",
      fileLink: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      detailDocs: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      bodyField: ".entry-content, .post-content, .field-name-body .field-item",
      titleFallbacks: [{ selector: ".entry-title" }, { selector: "h1" }],
      titleUsesType: false,
      defaultRowTitle: "शीर्षक उपलब्ध छैन",
      defaultDetailTitle: "शीर्षक उपलब्ध छैन",
      fallbackWhen: "emptyRows",
    },
  },
};