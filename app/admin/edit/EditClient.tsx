'use client';

import { useState } from 'react';
import { editWineMetadata } from '../actions';
import styles from '../Admin.module.css';

interface Wine {
  id: number;
  title: string;
  producer: string;
  vintage: string;
  country: string | null;
  grape: string | null;
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
  const [country, setCountry] = useState(wine.country || '');
  const [grape, setGrape] = useState(wine.grape || '');

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
    formData.append('country', country);
    formData.append('grape', grape);

    const result = await editWineMetadata(formData);

    if (result.success) {
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setErrorMsg(result.message || 'Failed to save');
      setStatus('error');
    }
  };

  const isChanged = country !== (wine.country || '') || grape !== (wine.grape || '');

  return (
    <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
      <div style={{ marginBottom: '1rem' }}>
        <strong>{wine.producer}</strong> — {wine.title} ({wine.vintage})
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
        <div className={styles.group}>
          <label>Country</label>
          <input 
            type="text" 
            list="countries-list" 
            value={country} 
            onChange={e => setCountry(e.target.value)} 
            placeholder="Type or select a country..."
            style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--background)', color: 'var(--foreground)' }} 
          />
          <datalist id="countries-list">
            <option value="Unknown" />
            {countries.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        
        <div className={styles.group}>
          <label>Varietal</label>
          <input 
            type="text" 
            list="grapes-list" 
            value={grape} 
            onChange={e => setGrape(e.target.value)} 
            placeholder="Type or select a grape..."
            style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--background)', color: 'var(--foreground)' }} 
          />
          <datalist id="grapes-list">
            <option value="Unknown" />
            {grapes.map(g => <option key={g} value={g} />)}
          </datalist>
        </div>

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
          {status === 'saving' ? '...' : status === 'saved' ? 'Saved!' : 'Update'}
        </button>
      </div>
      
      {status === 'error' && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem' }}>{errorMsg}</p>}
    </div>
  );
}
