'use client';

import { useState } from 'react';
import { editWineMetadata, deleteWine } from '../actions';
import styles from '../Admin.module.css';

interface Wine {
  id: number;
  title: string;
  producer: string;
  vintage: string;
  notes: string | null;
  country: string | null;
  grape: string | null;
  datePosted: string | null;
}

interface EditClientProps {
  wines: Wine[];
  countries: string[];
  grapes: string[];
  searchParam: string;
}

export default function EditClient({ wines, countries, grapes, searchParam }: EditClientProps) {
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState(searchParam);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/admin/edit?search=${encodeURIComponent(search)}`;
  };

  return (
    <div className={styles.adminPage} style={{ maxWidth: '800px' }}>
      <h1>Edit Metadata</h1>
      <p>Quickly fix mislabeled countries and varietals. Password is required to save.</p>
      
      <div className={styles.group} style={{ marginBottom: '2rem' }}>
        <label>Admin Password (Required for all edits)</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password once to edit below..."
        />
      </div>

      <form onSubmit={handleSearch} className={styles.group} style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or producer..."
          style={{ flex: 1 }}
        />
        <button type="submit" className={styles.submitBtn} style={{ width: 'auto', marginTop: 0 }}>Search</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {wines.length === 0 ? (
          <p>No wines found.</p>
        ) : (
          wines.map(wine => (
            <EditForm 
              key={wine.id} 
              wine={wine} 
              password={password} 
              countries={countries} 
              grapes={grapes} 
            />
          ))
        )}
      </div>
    </div>
  );
}

function EditForm({ wine, password, countries, grapes }: { wine: Wine, password: string, countries: string[], grapes: string[] }) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [title, setTitle] = useState(wine.title || '');
  const [producer, setProducer] = useState(wine.producer || '');
  const [vintage, setVintage] = useState(wine.vintage || '');
  const [notes, setNotes] = useState(wine.notes || '');
  const [country, setCountry] = useState(wine.country || '');
  const [grape, setGrape] = useState(wine.grape || '');

  const initialDate = wine.datePosted ? wine.datePosted.substring(0, 16) : '';
  const [datePosted, setDatePosted] = useState(initialDate);

  const handleSave = async () => {
    if (!password) {
      setErrorMsg('Password required at top of page');
      setStatus('error');
      return;
    }

    setStatus('saving');
    const formData = new FormData();
    formData.append('id', wine.id.toString());
    formData.append('password', password);
    formData.append('title', title);
    formData.append('producer', producer);
    formData.append('vintage', vintage);
    formData.append('notes', notes);
    formData.append('country', country);
    formData.append('grape', grape);
    
    // Append the precision trailing zeroes for Turso/SQLite ISO sorting consistency
    const finalDate = datePosted.length === 16 ? `${datePosted}:00.000Z` : datePosted;
    formData.append('datePosted', finalDate);

    const result = await editWineMetadata(formData);

    if (result.success) {
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
      setErrorMsg('');
    } else {
      setErrorMsg(result.message || 'Failed to save');
      setStatus('error');
    }
  };

  const handleDelete = async () => {
    if (!password) {
      setErrorMsg('Password required at top of page');
      return;
    }
    if (!confirm(`Are you sure you want to PERMANENTLY delete "${wine.title}"?`)) return;

    setStatus('saving');
    const formData = new FormData();
    formData.append('id', wine.id.toString());
    formData.append('password', password);

    const result = await deleteWine(formData);

    if (result.success) {
      window.location.reload();
    } else {
      setErrorMsg(result.message || 'Failed to delete');
      setStatus('error');
    }
  };

  const isChanged = 
    title !== (wine.title || '') ||
    producer !== (wine.producer || '') ||
    vintage !== (wine.vintage || '') ||
    notes !== (wine.notes || '') ||
    country !== (wine.country || '') ||
    grape !== (wine.grape || '') ||
    datePosted !== initialDate;

  return (
    <div style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className={styles.group}>
          <label>Producer</label>
          <input type="text" value={producer} onChange={e => setProducer(e.target.value)} />
        </div>
        <div className={styles.group}>
          <label>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className={styles.group}>
          <label>Vintage</label>
          <input type="text" value={vintage} onChange={e => setVintage(e.target.value)} />
        </div>
        <div className={styles.group}>
          <label>Posting Time (Local HH:MM)</label>
          <input type="datetime-local" value={datePosted} onChange={e => setDatePosted(e.target.value)} />
        </div>
        <div className={styles.group}>
          <label>Country</label>
          <input 
            type="text" 
            list="countries-list" 
            value={country} 
            onChange={e => setCountry(e.target.value)} 
            placeholder="Type or select a country..."
          />
        </div>
        <div className={styles.group}>
          <label>Varietal</label>
          <input 
            type="text" 
            list="grapes-list" 
            value={grape} 
            onChange={e => setGrape(e.target.value)} 
            placeholder="Type or select a grape..."
          />
        </div>
      </div>

      <div className={styles.group} style={{ marginBottom: '1.5rem' }}>
        <label>Tasting Notes</label>
        <textarea 
          rows={3} 
          value={notes} 
          onChange={e => setNotes(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={handleDelete}
          className={styles.submitBtn} 
          style={{ width: 'auto', margin: 0, background: 'transparent', color: 'red', border: '1px solid currentColor' }}
        >
          {status === 'saving' ? 'Processing...' : 'Delete Entry'}
        </button>

        <button 
          onClick={handleSave} 
          disabled={!isChanged || status === 'saving'}
          className={styles.submitBtn}
          style={{ 
            width: 'auto', 
            margin: 0, 
            opacity: isChanged ? 1 : 0.5,
            background: status === 'saved' ? 'var(--foreground)' : (status === 'error' ? 'red' : 'var(--accent)'),
            color: status === 'saved' ? 'var(--background)' : '#fff'
          }}
        >
          {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Update Metadata'}
        </button>
      </div>
      
      {status === 'error' && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'right' }}>{errorMsg}</p>}
      
      <datalist id="countries-list">
        <option value="Unknown" />
        {countries.map(c => <option key={c} value={c} />)}
      </datalist>
      <datalist id="grapes-list">
        <option value="Unknown" />
        {grapes.map(g => <option key={g} value={g} />)}
      </datalist>
    </div>
  );
}
