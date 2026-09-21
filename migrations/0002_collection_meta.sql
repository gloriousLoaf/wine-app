-- A materialized snapshot of the collection's derived metadata.
--
-- The filter dropdowns, bottle count and date range used to be computed from
-- the `wines` table on every page view. That cost roughly 3,900 rows read per
-- view against a 1,166-row table, because none of those queries can be made
-- cheap:
--
--   SELECT DISTINCT country ... WHERE country > ''   576 rows  (all non-NULL)
--   SELECT DISTINCT grape   ... WHERE grape   > ''  1011 rows  (all non-NULL)
--   SELECT DISTINCT vintage ... WHERE vintage > ''  1166 rows  (full scan)
--   SELECT count(*)                                 1166 rows  (full scan)
--
-- A `> ''` bound on an indexed column only seeks past the NULLs; everything
-- after it is walked. SQLite will not skip between distinct values here, and
-- count(*) has to visit every row no matter what.
--
-- This table holds the answer instead. One row, read with a primary-key lookup,
-- refreshed when /admin writes. Reading it costs 1 row.
--
-- Apply locally:   npx wrangler d1 execute wine-db --file migrations/0002_collection_meta.sql
-- Apply to prod:   npx wrangler d1 execute wine-db --file migrations/0002_collection_meta.sql --remote
--
-- Safe to re-run: the table is IF NOT EXISTS and the seed is an upsert.

CREATE TABLE IF NOT EXISTS collection_meta (
  -- Enforces a single row. There is exactly one collection.
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  countries   TEXT    NOT NULL,  -- JSON array of strings
  grapes      TEXT    NOT NULL,  -- JSON array of strings
  vintages    TEXT    NOT NULL,  -- JSON array of strings
  total_wines INTEGER NOT NULL,
  earliest    TEXT,
  latest      TEXT,
  updated_at  TEXT    NOT NULL
);

-- Seed it now so the first request after deploy does not have to compute it.
-- The app also computes-on-miss and writes back, so this is belt and braces —
-- but without it, every cold isolate racing the first request would each pay
-- the full ~3,900-row computation.
INSERT INTO collection_meta (id, countries, grapes, vintages, total_wines, earliest, latest, updated_at)
SELECT
  1,
  (SELECT json_group_array(v) FROM (SELECT DISTINCT country AS v FROM wines WHERE country > '' ORDER BY country ASC)),
  (SELECT json_group_array(v) FROM (SELECT DISTINCT grape   AS v FROM wines WHERE grape   > '' ORDER BY grape   ASC)),
  (SELECT json_group_array(v) FROM (SELECT DISTINCT vintage AS v FROM wines WHERE vintage > '' ORDER BY vintage DESC)),
  (SELECT count(*) FROM wines),
  (SELECT min(date_posted) FROM wines),
  (SELECT max(date_posted) FROM wines),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE true
ON CONFLICT(id) DO UPDATE SET
  countries   = excluded.countries,
  grapes      = excluded.grapes,
  vintages    = excluded.vintages,
  total_wines = excluded.total_wines,
  earliest    = excluded.earliest,
  latest      = excluded.latest,
  updated_at  = excluded.updated_at;
