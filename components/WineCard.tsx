'use client';

import Image from 'next/image';
import { useRef } from 'react';
import styles from './WineCard.module.css';

interface WineCardProps {
    wine: {
        id: number;
        producer: string;
        title: string;
        vintage: string;
        notes: string | null;
        imagePath: string;
        country: string | null;
        grape: string | null;
        isoCreatedAt: string;
    };
}

export default function WineCard({ wine }: WineCardProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    const openDialog = () => dialogRef.current?.showModal();
    const closeDialog = () => dialogRef.current?.close();

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <>
            <div className={styles.card} onClick={openDialog}>
                <div className={styles.imageContainer}>
                    <Image
                        src={wine.imagePath}
                        alt={wine.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className={styles.image}
                        priority={false}
                    />
                </div>
                <div className={styles.info}>
                    <p className={styles.title}>{wine.title} ({wine.vintage})</p>
                    <p className={styles.producer}>{wine.producer}</p>
                    {wine.notes && (
                        <p className={styles.snippet}>
                            {wine.notes}
                        </p>
                    )}
                    <p className={styles.postDate}>{formatDate(wine.isoCreatedAt)}</p>
                </div>
            </div>

            <dialog ref={dialogRef} className={styles.dialog}>
                <div className={styles.dialogContent}>
                    <button className={styles.closeBtn} onClick={closeDialog}>×</button>
                    <div className={styles.dialogGrid}>
                        <div className={styles.dialogImageContainer}>
                            <Image
                                src={wine.imagePath}
                                alt={wine.title}
                                width={500}
                                height={500}
                                className={styles.dialogImage}
                            />
                        </div>
                        <div className={styles.dialogText}>
                            <div className={styles.dialogHeaderRow}>
                                <h2>{wine.title}</h2>
                                <p className={styles.dialogPostDate}>Posted on {formatDate(wine.isoCreatedAt)}</p>
                            </div>
                            <p className={styles.dialogMeta}>
                                {wine.vintage} · {wine.producer}
                            </p>
                            <div className={styles.dialogTags}>
                                {wine.country && <span className={styles.tag}>{wine.country}</span>}
                                {wine.grape && <span className={styles.tag}>{wine.grape}</span>}
                            </div>
                            <div className={styles.dialogNotes}>
                                <p>{wine.notes || 'No review notes recorded.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </dialog>
        </>
    );
}
