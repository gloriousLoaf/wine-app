import styles from './EmptyState.module.css';

export default function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className={styles.emptyState}>
      {hasFilters ? (
        <>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2>Nothing found</h2>
          <p>We couldn't find any wines matching your criteria. Try removing some filters or searching for something else.</p>
        </>
      ) : (
        <>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2>Something went wrong</h2>
          <p>We couldn't load the wine catalog. The database might be empty or unavailable.</p>
        </>
      )}
    </div>
  );
}
