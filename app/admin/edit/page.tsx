import { getWinesForEdit, getFilterMetadata } from '../../../lib/db/repo';
import EditClient from './EditClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminEditPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const editableWines = await getWinesForEdit(params.search);
  const filters = await getFilterMetadata();

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <Link href="/admin" style={{ display: 'inline-block', marginBottom: '2rem', color: 'var(--muted-foreground)' }}>
        ← Back to Add Wine
      </Link>
      <EditClient 
        wines={editableWines as any} 
        countries={filters.countries} 
        grapes={filters.grapes} 
        searchParam={params.search || ''} 
      />
    </div>
  );
}
