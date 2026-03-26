'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import styles from './ActiveFilters.module.css';

export default function ActiveFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeFilters: { key: string, value: string }[] = [];
  searchParams.forEach((value, key) => {
    if (['country', 'grape', 'vintage', 'search'].includes(key) && value) {
      activeFilters.push({ key, value });
    }
  });

  if (activeFilters.length === 0) return null;

  const removeFilter = (keyToRemove: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(keyToRemove);
    router.push(`/?${params.toString()}`);
  };

  const clearAll = () => {
    router.push('/');
  };

  return (
    <div className={styles.container}>
      {activeFilters.map(({ key, value }) => (
        <button 
          key={key} 
          className={styles.pill} 
          onClick={() => removeFilter(key)}
          aria-label={`Remove ${key} filter`}
        >
          {key === 'search' ? `"${value}"` : value}
          <span className={styles.removeIcon}>&times;</span>
        </button>
      ))}
      {activeFilters.length > 1 && (
        <button className={styles.clearBtn} onClick={clearAll}>
          Clear all
        </button>
      )}
    </div>
  );
}
