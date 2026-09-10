import { getDb } from './index';
import { wines } from './schema';
import { desc, eq, and, or, gt, sql } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { cached, CACHE_KEYS } from './cache';
import {
  DEFAULT_PAGE_SIZE,
  MAX_OFFSET,
  MAX_PAGE_SIZE,
  normalizeSearch,
} from '../query-params';

/**
 * Build a LIKE pattern for a user-supplied term.
 *
 * Drizzle parameterizes the value, so this is not about injection — it is that
 * `%` and `_` are wildcards inside LIKE. Without escaping, searching for "50%"
 * matches every row. Paired with `ESCAPE '\'` in the predicate below.
 */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function getWines({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  country,
  grape,
  vintage,
  search,
}: {
  limit?: number;
  offset?: number;
  country?: string;
  grape?: string;
  vintage?: string;
  search?: string;
} = {}) {
  const conditions = [];

  if (country) conditions.push(eq(wines.country, country));
  if (grape) conditions.push(eq(wines.grape, grape));
  if (vintage) conditions.push(eq(wines.vintage, vintage));

  const term = normalizeSearch(search);
  if (term) {
    const pattern = likePattern(term);
    conditions.push(
      or(
        sql`${wines.title} LIKE ${pattern} ESCAPE '\\'`,
        sql`${wines.producer} LIKE ${pattern} ESCAPE '\\'`,
        sql`${wines.notes} LIKE ${pattern} ESCAPE '\\'`
      )
    );
  }

  // Callers normalize through parseWineQuery, but this is the last gate before
  // the query builder — clamp here too so no future caller can pass an
  // unbounded page size straight through to D1.
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const safeOffset = Math.min(Math.max(Math.trunc(offset) || 0, 0), MAX_OFFSET);

  return getDb().query.wines.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(wines.datePosted)],
    limit: safeLimit,
    offset: safeOffset,
  });
}

/**
 * Distinct values for one filter column.
 *
 * The `> ''` predicate is load-bearing, not cosmetic. It gives SQLite a range
 * bound on the leading column of the covering index, which turns the plan from
 * `SCAN wines` (every row) into `SEARCH wines USING COVERING INDEX (col>?)` —
 * a distinct-value seek that reads one row per distinct value. It also drops
 * NULL and empty values, matching the `.filter(Boolean)` this used to do in JS.
 */
async function distinctValues(column: AnySQLiteColumn): Promise<string[]> {
  // Cast: the column is passed in generically, so drizzle cannot infer the
  // selected value's type here. Every column this is called with is TEXT.
  const rows = (await getDb()
    .selectDistinct({ value: column })
    .from(wines)
    .where(gt(column, ''))) as Array<{ value: string | null }>;

  return rows
    .map((row) => row.value)
    .filter((value): value is string => Boolean(value));
}

export async function getFilterMetadata() {
  return cached(CACHE_KEYS.filterMetadata, async () => {
    const [countries, grapes, vintages] = await Promise.all([
      distinctValues(wines.country),
      distinctValues(wines.grape),
      distinctValues(wines.vintage),
    ]);

    return {
      countries: countries.sort(),
      grapes: grapes.sort(),
      vintages: vintages.sort().reverse(),
    };
  });
}

/**
 * Total bottle count plus the date range of the collection.
 *
 * `min()` and `max()` are issued as separate statements on purpose: each one
 * alone resolves to a single index seek, whereas selecting both in one
 * statement forces SQLite to scan the whole index to compute them together.
 *
 * `count(*)` still has to walk the index and is the one query here that cannot
 * be made cheap — which is exactly why this result is cached.
 */
export async function getCollectionStats() {
  return cached(CACHE_KEYS.collectionStats, async () => {
    const db = getDb();

    const [countRows, earliestRows, latestRows] = await Promise.all([
      db.select({ value: sql<number>`count(*)` }).from(wines),
      db.select({ value: sql<string | null>`min(${wines.datePosted})` }).from(wines),
      db.select({ value: sql<string | null>`max(${wines.datePosted})` }).from(wines),
    ]);

    return {
      total: countRows[0]?.value ?? 0,
      earliest: earliestRows[0]?.value ?? null,
      latest: latestRows[0]?.value ?? null,
    };
  });
}

export async function getWinesForEdit(search?: string) {
  const conditions = [];
  const term = normalizeSearch(search);

  if (term) {
    const pattern = likePattern(term);
    conditions.push(
      or(
        sql`${wines.title} LIKE ${pattern} ESCAPE '\\'`,
        sql`${wines.producer} LIKE ${pattern} ESCAPE '\\'`
      )
    );
  } else {
    // If no search, show a sample of wines missing metadata
    conditions.push(
      or(
        eq(wines.country, 'Unknown'),
        eq(wines.grape, 'Unknown'),
        sql`${wines.country} IS NULL`,
        sql`${wines.grape} IS NULL`
      )
    );
  }

  return getDb().query.wines.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(wines.datePosted)],
    limit: 50,
  });
}
