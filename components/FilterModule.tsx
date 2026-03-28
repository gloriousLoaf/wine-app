'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './FilterModule.module.css';

interface FilterMetadata {
    countries: string[];
    grapes: string[];
    vintages: string[];
}

interface FilterModuleProps {
    filters: FilterMetadata;
    currentFilters: {
        country?: string;
        grape?: string;
        vintage?: string;
        search?: string;
    };
}

export default function FilterModule({ filters, currentFilters }: FilterModuleProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [searchValue, setSearchValue] = useState(currentFilters.search || '');
    const filterDialogRef = useRef<HTMLDialogElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Expand/contract state
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter state
    const [country, setCountry] = useState(currentFilters.country || '');
    const [grape, setGrape] = useState(currentFilters.grape || '');
    const [vintage, setVintage] = useState(currentFilters.vintage || '');

    // Sync external URL changes to internal filter state
    useEffect(() => {
        setCountry(currentFilters.country || '');
        setGrape(currentFilters.grape || '');
        setVintage(currentFilters.vintage || '');
        setSearchValue(currentFilters.search || '');
    }, [currentFilters]);

    const toggleTheme = () => {
        const newTheme = !isDarkMode ? 'dark' : 'light';
        setIsDarkMode(!isDarkMode);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const openFilters = () => filterDialogRef.current?.showModal();
    const closeFilters = () => filterDialogRef.current?.close();

    const applyFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        if (country) params.set('country', country); else params.delete('country');
        if (grape) params.set('grape', grape); else params.delete('grape');
        if (vintage) params.set('vintage', vintage); else params.delete('vintage');
        if (searchValue) params.set('search', searchValue); else params.delete('search');

        router.push(`/?${params.toString()}`);
        closeFilters();
    };

    const clearDialogFilters = () => {
        setCountry('');
        setGrape('');
        setVintage('');
        setSearchValue('');
        router.push('/');
    };

    // Debounced search update
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchValue !== (currentFilters.search || '')) {
                const params = new URLSearchParams(searchParams.toString());
                if (searchValue) params.set('search', searchValue); else params.delete('search');
                router.push(`/?${params.toString()}`);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchValue, router, searchParams, currentFilters.search]);

    return (
        <>
            <div className={`${styles.bar} ${isExpanded || searchValue ? styles.expanded : styles.collapsed}`}>
                <div className={styles.container}>
                    <div 
                        className={styles.searchInputWrapper}
                        onClick={() => {
                            setIsExpanded(true);
                            searchInputRef.current?.focus();
                        }}
                        onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                if (!searchValue) setIsExpanded(false);
                            }
                        }}
                    >
                        <svg className={styles.searchIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search wines..."
                            className={styles.searchInput}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onFocus={() => setIsExpanded(true)}
                        />
                    </div>

                    <button className={styles.iconBtn} onClick={openFilters} aria-label="Open Filters">
                        <svg className={styles.filterIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                    </button>

                    <button className={styles.iconBtn} onClick={toggleTheme} aria-label="Toggle Theme">
                        {isDarkMode ? (
                            <svg className={styles.themeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
                            </svg>
                        ) : (
                            <svg className={styles.themeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            <dialog ref={filterDialogRef} className={styles.dialog}>
                <div className="sr-only" tabIndex={0}>
                    Filter criteria dialog. Press Tab to access the filter options.
                </div>
                <div className={styles.dialogHeader}>
                    <h2>Filters</h2>
                    <button onClick={closeFilters} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} aria-label="Close filters">×</button>
                </div>

                <div className={styles.filterGroup}>
                    <label>Country</label>
                    <select
                        className={styles.select}
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                    >
                        <option value="">All Countries</option>
                        {filters.countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label>Grape Variety</label>
                    <select
                        className={styles.select}
                        value={grape}
                        onChange={(e) => setGrape(e.target.value)}
                    >
                        <option value="">All Grapes</option>
                        {filters.grapes.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label>Vintage</label>
                    <select
                        className={styles.select}
                        value={vintage}
                        onChange={(e) => setVintage(e.target.value)}
                    >
                        <option value="">All Vintages</option>
                        {filters.vintages.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>

                <div className={styles.dialogActionRow}>
                    <button className={styles.applyBtn} onClick={applyFilters}>Apply Filters</button>
                    <button className={styles.clearDialogBtn} onClick={clearDialogFilters}>Clear filters</button>
                </div>
            </dialog>
        </>
    );
}
