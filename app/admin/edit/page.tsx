import EditClient from './EditClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Renders a shell only — no database access.
 *
 * This page used to query D1 during server render (the edit list plus the
 * filter metadata, roughly two full table scans) before any password was
 * checked, which made it an unauthenticated way to spend the daily read quota.
 * The list is now fetched by the client through the password-checked
 * `loadWinesForEdit` action instead.
 */
export default function AdminEditPage() {
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
      <EditClient />
    </div>
  );
}
