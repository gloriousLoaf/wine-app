import { getDb } from './index';
import { wines, collectionMeta } from './schema';
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

export interface CollectionSnapshot {
  countries: string[];
  grapes: string[];
  vintages: string[];
  total: number;
  earliest: string | null;
  latest: string | null;
}

/**
 * Derive the snapshot from the `wines` table. **Expensive — roughly 3,900 rows
 * read against a 1,166-row table.** Only call this on an admin write, or once
 * to populate `collection_meta` when it is empty.
 *
 * Every query here is irreducibly costly, which is the whole reason the result
 * is materialized rather than computed per request:
 *
 * - `SELECT DISTINCT <col> WHERE <col> > ''` reads every non-NULL row. The
 *   `> ''` bound seeks past the NULLs and then scans the rest; SQLite does not
 *   skip between distinct values. Measured in production: 576 rows for country,
 *   1,011 for grape, 1,166 for vintage (which is NOT NULL, so a full scan).
 * - `count(*)` visits every row whatever the indexing.
 *
 * `min()` and `max()` are the exception — issued separately, each resolves to a
 * single index seek. They are cheap and stay as they are.
 */
export async function computeCollectionSnapshot(): Promise<CollectionSnapshot> {
  const db = getDb();

  const [countries, grapes, vintages, countRows, earliestRows, latestRows] = await Promise.all([
    distinctValues(wines.country),
    distinctValues(wines.grape),
    distinctValues(wines.vintage),
    db.select({ value: sql<number>`count(*)` }).from(wines),
    db.select({ value: sql<string | null>`min(${wines.datePosted})` }).from(wines),
    db.select({ value: sql<string | null>`max(${wines.datePosted})` }).from(wines),
  ]);

  return {
    countries: countries.sort(),
    grapes: grapes.sort(),
    vintages: vintages.sort().reverse(),
    total: countRows[0]?.value ?? 0,
    earliest: earliestRows[0]?.value ?? null,
    latest: latestRows[0]?.value ?? null,
  };
}

/** Tolerates a malformed or absent column rather than throwing on render. */
function parseStringArray(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

async function writeCollectionMeta(snapshot: CollectionSnapshot): Promise<void> {
  await getDb()
    .insert(collectionMeta)
    .values({
      id: 1,
      countries: JSON.stringify(snapshot.countries),
      grapes: JSON.stringify(snapshot.grapes),
      vintages: JSON.stringify(snapshot.vintages),
      totalWines: snapshot.total,
      earliest: snapshot.earliest,
      latest: snapshot.latest,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: collectionMeta.id,
      set: {
        countries: JSON.stringify(snapshot.countries),
        grapes: JSON.stringify(snapshot.grapes),
        vintages: JSON.stringify(snapshot.vintages),
        totalWines: snapshot.total,
        earliest: snapshot.earliest,
        latest: snapshot.latest,
        updatedAt: new Date().toISOString(),
      },
    });
}

/**
 * The collection's filter values, bottle count and date range.
 *
 * Reads the materialized `collection_meta` row — a primary-key lookup, so **one
 * row read** regardless of how big the collection gets. This is the query every
 * page view makes, so it is the one that had to be cheap.
 *
 * If the row is missing (a fresh database, or before the migration's seed has
 * run) it computes the snapshot and writes it back, so the expensive path is
 * paid once rather than per request. A failed write-back is not fatal — the
 * caller still gets correct data, it just costs again next time.
 *
 * The same fallback covers the table not existing at all, which makes deploy
 * order safe: shipping this code before applying migration 0002 degrades to the
 * old (expensive) behaviour instead of returning 500s for every page view.
 */
export async function getCollectionSnapshot(): Promise<CollectionSnapshot> {
  return cached(CACHE_KEYS.collectionSnapshot, async () => {
    let row: typeof collectionMeta.$inferSelect | undefined;

    try {
      const rows = await getDb()
        .select()
        .from(collectionMeta)
        .where(eq(collectionMeta.id, 1))
        .limit(1);
      row = rows[0];
    } catch (error) {
      // Most likely `no such table` — migration 0002 has not been applied yet.
      console.error('collection_meta unavailable, computing live instead:', error);
    }

    if (row) {
      return {
        countries: parseStringArray(row.countries),
        grapes: parseStringArray(row.grapes),
        vintages: parseStringArray(row.vintages),
        total: row.totalWines,
        earliest: row.earliest,
        latest: row.latest,
      };
    }

    const snapshot = await computeCollectionSnapshot();
    try {
      await writeCollectionMeta(snapshot);
    } catch (error) {
      console.error('Failed to seed collection_meta:', error);
    }
    return snapshot;
  });
}

/**
 * Recompute the snapshot and store it. Called by the admin write actions, which
 * are the only thing that can change any of it.
 *
 * Must run *before* the edge cache is purged, so the purged cache refills from
 * fresh data rather than from a request that raced in between.
 */
export async function refreshCollectionMeta(): Promise<void> {
  const snapshot = await computeCollectionSnapshot();
  await writeCollectionMeta(snapshot);
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
