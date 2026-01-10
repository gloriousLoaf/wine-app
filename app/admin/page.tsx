'use client';

import { useState } from 'react';
import { addWine } from './actions';
import styles from './Admin.module.css';

export default function AdminPage() {
    const [status, setStatus] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setStatus('Uploading...');
        try {
            await addWine(formData);
            setStatus('Success! Wine added.');
            (document.getElementById('admin-form') as HTMLFormElement).reset();
        } catch (err) {
            setStatus(`Error: ${err instanceof Error ? err.message : 'Upload failed'}`);
        }
    }

    return (
        <div className="container">
            <div className={styles.adminPage}>
                <h1>Admin: Add New Wine</h1>
                <p>Enter the details below. Note: Image must manually be placed in <code>public/images/wines/</code> for now.</p>

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
                            <label>Image Filename</label>
                            <input type="text" name="imageTitle" required placeholder="e.g. 2014_marthas_vineyard.jpg" />
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
            </div>
        </div>
    );
}
