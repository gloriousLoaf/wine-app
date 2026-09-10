/**
 * Validation for the public wine-listing query string.
 *
 * Both the homepage and /api/wines take limit/offset/country/grape/vintage/search
 * straight from the URL. Untrusted input reaching a query builder unchecked is
 * how `?limit=1000000` turned a paginated endpoint into a full-table export, so
 * everything is normalized through here before it can reach the database.
 */

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

/**
 * Deep paging is a scan even with an index — SQLite still walks the skipped
 * entries. The collection is ~1.1k bottles, so this is well past the end of any
 * real filtered result set while keeping crawler-driven paging bounded.
 */
export const MAX_OFFSET = 5_000;

export const MIN_SEARCH_LENGTH = 2;
export const MAX_SEARCH_LENGTH = 64;

/** Facet values are matched with `=`, so they only need a sane upper bound. */
const MAX_FACET_LENGTH = 64;

/** The filter half of the query string — everything except paging. */
export interface WineFilters {
  country?: string;
  grape?: string;
  vintage?: string;
  search?: string;
}

export interface WineQuery extends WineFilters {
  limit: number;
  offset: number;
}

/** Accepts either URLSearchParams or the plain object Next gives a page. */
type ParamSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function read(source: ParamSource, key: string): string | undefined {
  const raw =
    source instanceof URLSearchParams ? source.get(key) : source[key];
  if (Array.isArray(raw)) return raw[0];
  return raw ?? undefined;
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined) return fallback;
  // parseInt would accept "12abc" and yield NaN for "abc"; Number.parseInt plus
  // an explicit finite check keeps NaN from ever reaching the query builder.
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

/**
 * A search term is only worth a query if it is long enough to be selective.
 * `LIKE '%x%'` can never use an index, so each distinct term costs a full scan —
 * one-character terms match nearly everything and are pure cost.
 */
export function normalizeSearch(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().slice(0, MAX_SEARCH_LENGTH);
  return trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : undefined;
}

function normalizeFacet(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().slice(0, MAX_FACET_LENGTH);
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseWineFilters(source: ParamSource): WineFilters {
  return {
    country: normalizeFacet(read(source, 'country')),
    grape: normalizeFacet(read(source, 'grape')),
    vintage: normalizeFacet(read(source, 'vintage')),
    search: normalizeSearch(read(source, 'search')),
  };
}

export function parseWineQuery(source: ParamSource): WineQuery {
  return {
    ...parseWineFilters(source),
    limit: clampInt(read(source, 'limit'), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
    offset: clampInt(read(source, 'offset'), 0, 0, MAX_OFFSET),
  };
}
