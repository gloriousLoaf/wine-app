'use client';

import { useRef } from 'react';
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
  const bottlesDialogRef = useRef<HTMLDialogElement>(null);
  const countriesDialogRef = useRef<HTMLDialogElement>(null);
  const grapesDialogRef = useRef<HTMLDialogElement>(null);

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
        <div className={styles.dialogHeader}>
          <h2>Collection Stats</h2>
          <button onClick={() => bottlesDialogRef.current?.close()} className={styles.closeBtn}>×</button>
        </div>
        <div className={styles.dialogContent}>
          <p><strong>First bottle added:</strong> {formatDate(bottleStats.earliest)}</p>
          <p><strong>Latest:</strong> {formatDate(bottleStats.latest)}</p>

          <h3 className={styles.subhead}>Vintages in Collection</h3>
          <div className={styles.listGrid}>
            {vintages.map(v => <span key={v} className={styles.listItem}>{v}</span>)}
          </div>
        </div>
      </dialog>

      {/* Countries Dialog */}
      <dialog ref={countriesDialogRef} className={styles.dialog}>
        <div className={styles.dialogHeader}>
          <h2>Countries ({countries.length})</h2>
          <button onClick={() => countriesDialogRef.current?.close()} className={styles.closeBtn}>×</button>
        </div>
        <div className={styles.dialogContent}>
          <div className={styles.listGrid}>
            {countries.map(c => <span key={c} className={styles.listItem}>{c}</span>)}
          </div>
        </div>
      </dialog>

      {/* Varietals Dialog */}
      <dialog ref={grapesDialogRef} className={styles.dialog}>
        <div className={styles.dialogHeader}>
          <h2>Varietals ({grapes.length})</h2>
          <button onClick={() => grapesDialogRef.current?.close()} className={styles.closeBtn}>×</button>
        </div>
        <div className={styles.dialogContent}>
          <div className={styles.listGrid}>
            {grapes.map(g => <span key={g} className={styles.listItem}>{g}</span>)}
          </div>
        </div>
      </dialog>
    </>
  );
}
