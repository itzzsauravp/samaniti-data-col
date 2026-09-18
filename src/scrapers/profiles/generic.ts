import { SelectorProfile } from "../../core/contracts/site-config.js";

/**
 * Generic fallback profile. No stack was matched, so entities fall back to
 * loose, well-known patterns (article/entry semantics) which per-entity
 * selector overrides in the site config refine.
 */
export const generic: SelectorProfile = {
  stack: "generic",
  entities: {
    report: {
      rows: "article, .views-row",
      titleLink: "h2 a, h3 a, .title a",
      dateField: "time, .date, .created",
      fileLink: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      detailDocs: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      bodyField: ".content, .field-name-body .field-item, article",
      titleFallbacks: [
        { selector: "h1" },
        { selector: 'meta[property="og:title"]', attribute: "content" },
      ],
      titleUsesType: false,
      defaultRowTitle: "शीर्षक उपलब्ध छैन",
      defaultDetailTitle: "शीर्षक उपलब्ध छैन",
      fallbackWhen: "emptyRows",
    },
    project: {
      rows: "article, .views-row",
      titleLink: "h2 a, h3 a, .title a",
      dateField: null,
      fileLink: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      detailDocs: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      bodyField: ".content, .field-name-body .field-item, article",
      titleFallbacks: [
        { selector: "h1" },
        { selector: 'meta[property="og:title"]', attribute: "content" },
      ],
      titleUsesType: false,
      defaultRowTitle: "शीर्षक उपलब्ध छैन",
      defaultDetailTitle: "शीर्षक उपलब्ध छैन",
      fallbackWhen: "emptyRows",
    },
    notice: {
      rows: "article, .views-row, .post",
      titleLink: "h2 a, h3 a, .title a",
      dateField: "time, .date, .created",
      fileLink: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      detailDocs: "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx']",
      bodyField: ".content, .field-name-body .field-item, article",
      titleFallbacks: [
        { selector: "h1" },
        { selector: 'meta[property="og:title"]', attribute: "content" },
      ],
      titleUsesType: false,
      defaultRowTitle: "शीर्षक उपलब्ध छैन",
      defaultDetailTitle: "शीर्षक उपलब्ध छैन",
      fallbackWhen: "emptyRows",
    },
  },
};