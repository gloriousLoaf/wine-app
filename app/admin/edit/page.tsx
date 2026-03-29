import { getWinesForEdit, getFilterMetadata } from '../../../lib/db/repo';
import EditClient from './EditClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminEditPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; }>;
}) {
  const params = await searchParams;
  const editableWines = await getWinesForEdit(params.search);
  const filters = await getFilterMetadata();

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/" style={{ color: 'var(--muted-foreground)' }}>
          ← Back to Collection
        </Link>
        <span style={{ color: 'var(--border)' }}>|</span>
        <Link href="/admin" style={{ color: 'var(--muted-foreground)' }}>
          Go to Add Wine →
        </Link>
      </div>
      <EditClient
        wines={editableWines}
        countries={filters.countries}
        grapes={filters.grapes}
        searchParam={params.search || ''}
      />
    </div>
  );
}
