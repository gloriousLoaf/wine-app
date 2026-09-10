-- Indexes for the `wines` table.
--
-- Before these existed every query in the app was a full table scan. D1 bills
-- rows read, so rendering one page cost roughly 4 x <row count> reads.
--
-- Apply locally:   npx wrangler d1 execute wine-db --file migrations/0001_add_indexes.sql
-- Apply to prod:   npx wrangler d1 execute wine-db --file migrations/0001_add_indexes.sql --remote
--
-- Safe to re-run: every statement is IF NOT EXISTS.

-- Sort key for the unfiltered collection view and for infinite-scroll paging.
-- Also lets `SELECT min(date_posted)` / `max(date_posted)` resolve as single
-- index seeks instead of scanning the table.
CREATE INDEX IF NOT EXISTS idx_wines_date_posted
  ON wines (date_posted);

-- Filter columns, each paired with the sort key so that
-- `WHERE <col> = ? ORDER BY date_posted DESC LIMIT n` is a seek + early exit.
-- These also power the filter dropdowns: `SELECT DISTINCT <col> ... WHERE <col> > ''`
-- becomes a distinct-value seek that reads one row per distinct value.
CREATE INDEX IF NOT EXISTS idx_wines_country_date
  ON wines (country, date_posted);

CREATE INDEX IF NOT EXISTS idx_wines_grape_date
  ON wines (grape, date_posted);

CREATE INDEX IF NOT EXISTS idx_wines_vintage_date
  ON wines (vintage, date_posted);
