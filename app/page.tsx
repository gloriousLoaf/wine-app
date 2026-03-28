import { getWines, getFilterMetadata, getTotalWinesCount, getBottleStats } from '../lib/db/repo';
import WineGrid from '../components/WineGrid';
import FilterModule from '../components/FilterModule';
import DashboardStats from '../components/DashboardStats';
import ActiveFilters from '../components/ActiveFilters';
import Link from 'next/link';

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
  const initialWines = await getWines({
    limit: 12,
    country: params.country,
    grape: params.grape,
    vintage: params.vintage,
    search: params.search,
  });
  const filters = await getFilterMetadata();
  const totalWines = await getTotalWinesCount();
  const bottleStats = await getBottleStats();

  return (
    <main>
      <header className="page-header">
        <div className="container">
          <h1>Wine Journal</h1>
          <p>Catalog of a <Link target="_blank" rel="noopener noreferrer" href="https://metcalf.dev">former sommelier</Link>.</p>

          <DashboardStats
            totalWines={totalWines}
            countries={filters.countries}
            grapes={filters.grapes}
            vintages={filters.vintages}
            bottleStats={bottleStats}
          />
          <ActiveFilters />
        </div>
      </header>


      <WineGrid initialWines={initialWines} filters={params} />

      <FilterModule filters={filters} currentFilters={params} />
    </main>
  );
}
