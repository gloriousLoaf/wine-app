'use client';

import { useState, useEffect, useCallback } from 'react';
import WineCard from './WineCard';
import EmptyState from './EmptyState';
import { useInView } from 'react-intersection-observer';

interface Wine {
    id: number;
    producer: string;
    title: string;
    vintage: string;
    notes: string | null;
    imagePath: string;
    country: string | null;
    grape: string | null;
    isoCreatedAt: string;
}

interface WineGridProps {
    initialWines: Wine[];
    filters: {
        country?: string;
        grape?: string;
        vintage?: string;
        search?: string;
    };
}

export default function WineGrid({ initialWines, filters }: WineGridProps) {
    const [wines, setWines] = useState(initialWines);
    const [offset, setOffset] = useState(initialWines.length);
    const [hasMore, setHasMore] = useState(initialWines.length >= 12);
    const { ref, inView } = useInView();

    // Reset state when filters change
    useEffect(() => {
        setWines(initialWines);
        setOffset(initialWines.length);
        setHasMore(initialWines.length >= 12);
    }, [initialWines]);

    const loadMore = useCallback(async () => {
        const params = new URLSearchParams();
        params.set('offset', offset.toString());
        params.set('limit', '12');
        if (filters.country) params.set('country', filters.country);
        if (filters.grape) params.set('grape', filters.grape);
        if (filters.vintage) params.set('vintage', filters.vintage);
        if (filters.search) params.set('search', filters.search);

        const res = await fetch(`/api/wines?${params.toString()}`);
        const newWines = await res.json();

        if (newWines.length === 0) {
            setHasMore(false);
        } else {
            setWines((prev) => [...prev, ...newWines]);
            setOffset((prev) => prev + newWines.length);
            if (newWines.length < 12) setHasMore(false);
        }
    }, [offset, filters]);

    useEffect(() => {
        if (inView && hasMore) {
            loadMore();
        }
    }, [inView, hasMore, loadMore]);

    const hasFilters = !!(filters.country || filters.grape || filters.vintage || filters.search);

    if (wines.length === 0 && !hasMore) {
        return (
            <div className="container" style={{ paddingBottom: '6rem' }}>
                <EmptyState hasFilters={hasFilters} />
            </div>
        );
    }

    return (
        <div className="container">
            <div className="wine-grid">
                {wines.map((wine) => (
                    <WineCard key={wine.id} wine={wine} />
                ))}
            </div>
            {hasMore && (
                <div ref={ref} className="loader">
                    <p>Loading more...</p>
                </div>
            )}
        </div>
    );
}
