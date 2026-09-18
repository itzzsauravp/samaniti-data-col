/**
 * URL normalisation + include/exclude filtering shared by the crawler.
 *
 * Filter config lives in a site config (`SiteConfig.urlFilters`) but crawler
 * URLs can be policed here without the site layer:
 * - protocol deny list (mailto:, javascript:, ...)
 * - host allowlist (defaults to the site's own host)
 * - include/exclude substring patterns (against the full URL)
 */

export interface UrlFilterConfig {
  /** URL must match ANY of these (substring) when non-empty. */
  include?: string[];
  /** URL is dropped when it matches ANY of these (substring). */
  exclude?: string[];
  /** Allowed hosts (no scheme/port). Defaults to the site's own host. */
  allowedDomains?: string[];
}

const BLOCKED_PROTOCOLS = /^(mailto:|javascript:|tel:|data:)/i;

/** Makes a link absolute, leaving external protocols untouched. */
export function toAbsoluteUrl(baseUrl: string, url: string): string {
  if (BLOCKED_PROTOCOLS.test(url) || url.startsWith("http")) return url;
  return `${baseUrl}${url}`;
}

/** Normalizes a URL for deduplication (drop fragment + trailing slash). */
export function normalizeUrl(url: string): string {
  return url.split("#")[0].replace(/\/+$/, "");
}

/** Pulls the lowercase hostname out of a URL, or null when unparseable. */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Host extracted from a base URL string. */
export function hostOfBase(baseUrl: string): string | null {
  return hostOf(baseUrl);
}

/**
 * Returns true when the URL is allowed by the filter.
 * Callers should pass the site origin so hosts outside it are rejected by default.
 */
export function isAllowedUrl(
  url: string,
  filter: UrlFilterConfig | undefined,
  defaultDomain: string | null | undefined,
): boolean {
  const lower = url.toLowerCase();
  if (BLOCKED_PROTOCOLS.test(lower) || lower.startsWith("#")) return false;

  const doms = filter?.allowedDomains?.length
    ? filter.allowedDomains
    : defaultDomain
      ? [defaultDomain]
      : [];
  const host = hostOf(url);
  if (host && doms.length > 0 && !doms.includes(host)) return false;

  if (filter?.exclude?.length) {
    const excluded = filter.exclude.some((p) => lower.includes(p.toLowerCase()));
    if (excluded) return false;
  }

  if (filter?.include?.length) {
    const included = filter.include.some((p) => lower.includes(p.toLowerCase()));
    if (!included) return false;
  }

  return true;
}

/** Deduplicates a list of URLs by their normalized form, preserving order. */
export function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const normalized = normalizeUrl(url);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(url);
  }
  return out;
}

/** Filters + deduplicates a URL list. */
export function filterUrls(
  urls: string[],
  filter: UrlFilterConfig | undefined,
  defaultDomain: string | null,
): string[] {
  return dedupeUrls(urls.filter((url) => isAllowedUrl(url, filter, defaultDomain)));
}