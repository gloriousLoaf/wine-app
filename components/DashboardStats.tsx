'use client';

import { useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './DashboardStats.module.css';

interface DashboardStatsProps {
  totalWines: number;
  countries: string[];
  grapes: string[];
  vintages: string[];
  bottleStats: { earliest: string; latest: string; };
}

export default function DashboardStats({
  totalWines,
  countries,
  grapes,
  vintages,
  bottleStats
}: DashboardStatsProps) {
  const searchParams = useSearchParams();
  const bottlesDialogRef = useRef<HTMLDialogElement>(null);
  const countriesDialogRef = useRef<HTMLDialogElement>(null);
  const grapesDialogRef = useRef<HTMLDialogElement>(null);

  const createQueryString = useCallback((name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    return params.toString();
  }, [searchParams]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Unknown';
    return new Date(isoString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <>
      <div className={styles.dashboardStats}>
        <button className={styles.statCard} onClick={() => bottlesDialogRef.current?.showModal()}>
          <span className={styles.statValue}>{totalWines}</span>
          <span className={styles.statLabel}>
            Wines
            <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </span>
        </button>
        <button className={styles.statCard} onClick={() => countriesDialogRef.current?.showModal()}>
          <span className={styles.statValue}>{countries.length}</span>
          <span className={styles.statLabel}>
            Countries
            <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </span>
        </button>
        <button className={styles.statCard} onClick={() => grapesDialogRef.current?.showModal()}>
          <span className={styles.statValue}>{grapes.length}</span>
          <span className={styles.statLabel}>
            Varietals
            <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </span>
        </button>
      </div>

      {/* Bottles Dialog */}
      <dialog ref={bottlesDialogRef} className={styles.dialog}>
        <div className="sr-only" tabIndex={0}>
          Collection statistics dialog. Press Tab to browse collection data and vintages, or to reach the close button.
        </div>
        <div className={styles.dialogHeader}>
          <h2>Collection Stats</h2>
          <button onClick={() => bottlesDialogRef.current?.close()} className={styles.closeBtn}>×</button>
        </div>
        <div className={styles.dialogContent}>
          <p><strong>First bottle added:</strong> {formatDate(bottleStats.earliest)}</p>
          <p><strong>Latest:</strong> {formatDate(bottleStats.latest)}</p>

          <h3 className={styles.subhead}>Vintages in Collection</h3>
          <div className={styles.listGrid}>
            {vintages.map(v => (
              <Link 
                key={v} 
                href={`/?${createQueryString('vintage', v)}`}
 
                className={styles.listLink}
                onClick={() => bottlesDialogRef.current?.close()}
              >
                {v}
              </Link>
            ))}
          </div>
        </div>
      </dialog>

      {/* Countries Dialog */}
      <dialog ref={countriesDialogRef} className={styles.dialog}>
        <div className="sr-only" tabIndex={0}>
          Countries filter dialog. Press Tab to browse the list of countries, or to reach the close button.
        </div>
        <div className={styles.dialogHeader}>
          <h2>Countries ({countries.length})</h2>
          <button onClick={() => countriesDialogRef.current?.close()} className={styles.closeBtn}>×</button>
        </div>
        <div className={styles.dialogContent}>
          <div className={styles.listGrid}>
            {countries.map(c => (
              <Link 
                key={c} 
                href={`/?${createQueryString('country', c)}`}
 
                className={styles.listLink}
                onClick={() => countriesDialogRef.current?.close()}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </dialog>

      {/* Varietals Dialog */}
      <dialog ref={grapesDialogRef} className={styles.dialog}>
        <div className="sr-only" tabIndex={0}>
          Varietals filter dialog. Press Tab to browse the list of grape varieties, or to reach the close button.
        </div>
        <div className={styles.dialogHeader}>
          <h2>Varietals ({grapes.length})</h2>
          <button onClick={() => grapesDialogRef.current?.close()} className={styles.closeBtn}>×</button>
        </div>
        <div className={styles.dialogContent}>
          <div className={styles.listGrid}>
            {grapes.map(g => (
              <Link 
                key={g} 
                href={`/?${createQueryString('grape', g)}`}
 
                className={styles.listLink}
                onClick={() => grapesDialogRef.current?.close()}
              >
                {g}
              </Link>
            ))}
          </div>

        </div>
      </dialog>
    </>
  );
}
