'use client';

import { useState } from 'react';
import { addWine } from './actions';
import styles from './Admin.module.css';

import Link from 'next/link';

export default function AdminPage() {
    const [status, setStatus] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setStatus('Uploading...');
        try {
            const result = await addWine(formData);
            if (!result?.success) {
                setStatus(`Error: ${result?.message || 'Upload failed'}`);
                return;
            }
            setStatus('Success! Wine added.');
            (document.getElementById('admin-form') as HTMLFormElement).reset();
        } catch (err) {
            setStatus(`Error: ${err instanceof Error ? err.message : 'Upload failed exceptions'}`);
        }
    }

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div className={styles.adminPage} style={{ margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <Link href="/" style={{ color: 'var(--muted-foreground)' }}>
                        ← Back to Collection
                    </Link>
                    <span style={{ color: 'var(--border)' }}>|</span>
                    <Link href="/admin/edit" style={{ color: 'var(--muted-foreground)' }}>
                        Go to Edit Wines →
                    </Link>
                </div>
                <h1>Admin: Add New Wine</h1>
                <p>New wines will be uploaded directly to Vercel Blob storage.</p>

                <form id="admin-form" action={handleSubmit} className={styles.form}>
                    <div className={styles.group}>
                        <label>Admin Password</label>
                        <input type="password" name="password" required />
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.group}>
                            <label>Producer</label>
                            <input type="text" name="producer" required placeholder="e.g. Heitz Cellar" />
                        </div>
                        <div className={styles.group}>
                            <label>Title</label>
                            <input type="text" name="title" required placeholder="e.g. Martha's Vineyard Cabernet" />
                        </div>
                        <div className={styles.group}>
                            <label>Vintage</label>
                            <input type="text" name="vintage" required placeholder="e.g. 2014 or NV" />
                        </div>
                        <div className={styles.group}>
                            <label>Wine Label Image</label>
                            <input type="file" name="imageFile" accept="image/*" required />
                        </div>
                        <div className={styles.group}>
                            <label>Country (Optional)</label>
                            <input type="text" name="country" placeholder="e.g. USA" />
                        </div>
                        <div className={styles.group}>
                            <label>Grape (Optional)</label>
                            <input type="text" name="grape" placeholder="e.g. Cabernet Sauvignon" />
                        </div>
                    </div>

                    <div className={styles.group}>
                        <label>Notes</label>
                        <textarea name="notes" rows={4} placeholder="Review notes and emojis..."></textarea>
                    </div>

                    <button type="submit" className={styles.submitBtn}>Add to Collection</button>
                </form>

                {status && <p className={styles.status}>{status}</p>}

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <a href="/admin/edit" style={{ color: 'var(--muted-foreground)', textDecoration: 'underline' }}>
                        Need to fix mislabeled wines? Go to the Edit page
                    </a>
                </div>
            </div>
        </div>
    );
}
