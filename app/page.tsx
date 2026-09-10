import { getWines, getFilterMetadata, getCollectionStats } from '../lib/db/repo';
import { parseWineFilters, DEFAULT_PAGE_SIZE } from '../lib/query-params';
import WineGrid from '../components/WineGrid';
import FilterModule from '../components/FilterModule';
import DashboardStats from '../components/DashboardStats';
import ActiveFilters from '../components/ActiveFilters';
import Link from 'next/link';
import styles from './page.module.css';

function formatTimeSpan(earliest: string | null, latest: string | null) {
  if (!earliest || !latest) return null;
  const start = new Date(earliest);
  const end = new Date(latest);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);

  if (parts.length === 0) return '0 days';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;

  return `${parts[0]}, ${parts[1]} & ${parts[2]}`;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    country?: string;
    grape?: string;
    vintage?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;

  // Normalize before anything reaches the database. The initial page size is
  // fixed rather than read from the URL — only /api/wines honours `limit`, so
  // there is one less knob to turn from a crawler's address bar.
  const activeFilters = parseWineFilters(params);

  // These three are independent; the two metadata queries are also cached, so
  // on a warm isolate this is a single indexed 12-row read.
  const [initialWines, filters, stats] = await Promise.all([
    getWines({ ...activeFilters, limit: DEFAULT_PAGE_SIZE }),
    getFilterMetadata(),
    getCollectionStats(),
  ]);

  const bottleStats = { earliest: stats.earliest, latest: stats.latest };

  return (
    <main>
      <header className={styles.pageHeader}>
        <div className="container">
          <h1 className={styles.title}>Wine Journal</h1>
          <p className={styles.subtitle}>Catalog of a <Link target="_blank" rel="noopener noreferrer" href="https://metcalf.dev">former sommelier</Link>.</p>
          {bottleStats.earliest && bottleStats.latest && (
            <p className={styles.timespan}>
              Time span: {formatTimeSpan(bottleStats.earliest, bottleStats.latest)}.
            </p>
          )}

          <DashboardStats
            totalWines={stats.total}
            countries={filters.countries}
            grapes={filters.grapes}
            vintages={filters.vintages}
            bottleStats={bottleStats}
          />
          <ActiveFilters />
        </div>
      </header>


      <WineGrid initialWines={initialWines} filters={activeFilters} />

      <FilterModule filters={filters} currentFilters={activeFilters} />
    </main>
  );
}
