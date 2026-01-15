import { getWines, getFilterMetadata } from '../lib/db/repo';
import WineGrid from '../components/WineGrid';
import FilterModule from '../components/FilterModule';

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

  return (
    <main>
      <header className="page-header">
        <div className="container">
          <h1>Untitled Wine App</h1>
          <p>Catalog of a former sommelier.</p>
        </div>
      </header>

      <WineGrid initialWines={initialWines} filters={params} />

      <FilterModule filters={filters} currentFilters={params} />
    </main>
  );
}
