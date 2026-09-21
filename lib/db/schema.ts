import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const wines = sqliteTable(
  'wines',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    producer: text('producer').notNull(),
    title: text('title').notNull(),
    vintage: text('vintage').notNull(), // text because of "NV"
    notes: text('notes'),
    imageTitle: text('image_title').notNull(),
    imagePath: text('image_path').notNull(),
    extImageUrl: text('ext_image_url'),
    isoCreatedAt: text('iso_created_at').notNull(),
    datePosted: text('date_posted'),
    country: text('country'),
    grape: text('grape'),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
  },
  (table) => [
    // Every list query sorts by date_posted DESC. Without this index SQLite scans
    // the whole table into a temp b-tree to sort it, then throws away all but the
    // first page — the full table is billed as rows read on every request.
    index('idx_wines_date_posted').on(table.datePosted),

    // Filter + sort in one index, so a filtered page is a seek instead of a scan.
    // The trailing date_posted lets SQLite satisfy the ORDER BY from the index.
    index('idx_wines_country_date').on(table.country, table.datePosted),
    index('idx_wines_grape_date').on(table.grape, table.datePosted),
    index('idx_wines_vintage_date').on(table.vintage, table.datePosted),
  ]
);

/**
 * A materialized snapshot of everything the UI needs *about* the collection,
 * as opposed to the wines themselves: the filter dropdown values, the bottle
 * count, and the date range.
 *
 * Exactly one row, id = 1 (enforced by a CHECK in the migration).
 *
 * This exists because none of those values can be derived cheaply. Measured
 * against the live 1,166-row table, one page view cost ~3,900 rows read:
 * `SELECT DISTINCT <col> ... WHERE <col> > ''` walks every non-NULL row (a
 * `> ''` bound seeks past the NULLs and then scans), and `count(*)` visits
 * every row regardless of indexing. Reading this row instead costs 1.
 *
 * Refreshed by the admin write actions. See `refreshCollectionMeta()`.
 */
export const collectionMeta = sqliteTable('collection_meta', {
  id: integer('id').primaryKey(),
  /** JSON array of strings, ascending. */
  countries: text('countries').notNull(),
  /** JSON array of strings, ascending. */
  grapes: text('grapes').notNull(),
  /** JSON array of strings, descending (newest vintage first). */
  vintages: text('vintages').notNull(),
  totalWines: integer('total_wines').notNull(),
  earliest: text('earliest'),
  latest: text('latest'),
  updatedAt: text('updated_at').notNull(),
});
