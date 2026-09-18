/**
 * Include/exclude keyword filtering for scraped items.
 *
 * Configure via environment variables:
 * - INCLUDE_KEYWORDS: comma-separated. An item is kept only if its text contains
 *   ANY of these keywords. Empty = keep everything.
 * - EXCLUDE_KEYWORDS: comma-separated. An item is always dropped if its text
 *   contains ANY of these keywords. Excludes win over includes.
 */
export interface KeywordFilter {
  include: string[];
  exclude: string[];
}

function parseKeywordList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((kw) => kw.trim())
    .filter(Boolean);
}

/** Builds a keyword filter from INCLUDE_KEYWORDS / EXCLUDE_KEYWORDS env vars. */
export function loadKeywordFilterFromEnv(): KeywordFilter {
  return {
    include: parseKeywordList(process.env.INCLUDE_KEYWORDS),
    exclude: parseKeywordList(process.env.EXCLUDE_KEYWORDS),
  };
}

/**
 * Returns true when the item should be filtered out (dropped).
 * Matching is case-insensitive and done against ALL provided texts (title, content, ...).
 *
 * Semantics: exclude wins. If include keywords are set, the item must match at least
 * one of them; if no include keywords are set, the include condition passes.
 */
export function isFilteredOut(
  filter: KeywordFilter,
  ...texts: (string | null | undefined)[]
): boolean {
  const haystack = texts
    .filter((t): t is string => Boolean(t))
    .map((t) => t.toLowerCase());

  if (haystack.length === 0) return false;

  if (filter.exclude.length > 0) {
    const excluded = filter.exclude.some((kw) =>
      haystack.some((text) => text.includes(kw.toLowerCase())),
    );
    if (excluded) return true;
  }

  if (filter.include.length > 0) {
    const included = filter.include.some((kw) =>
      haystack.some((text) => text.includes(kw.toLowerCase())),
    );
    if (!included) return true;
  }

  return false;
}