'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {demoLeads} from '@/lib/demo';
import {DiscoverySource, Lead} from '@/lib/types';

export default function Home() {
  const [keyword, setKeyword] = useState('dentists');
  const [location, setLocation] = useState('New York, NY');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DiscoverySource>('auto');
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem('opportunity-leads');
    if (stored) setAdded(JSON.parse(stored));
    const savedSource = window.localStorage.getItem('discovery-source');
    if (savedSource === 'google' || savedSource === 'osm' || savedSource === 'openstreetmap' || savedSource === 'auto') setSource(savedSource);
  }, []);

  const run = async () => {
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({keyword, location, source}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lead search failed');
      setLeads(data.leads || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Lead search failed');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const addToOpportunities = (id: string) => {
    const next = added.includes(id) ? added : [...added, id];
    setAdded(next);
    window.localStorage.setItem('opportunity-leads', JSON.stringify(next));
  };

  const rows = leads.length ? leads : searched && !loading ? demoLeads : [];

  return (
    <>
      <section className="hero"><h1>Find SEO opportunities</h1><p>Search local businesses, review their public details, and add the right prospects to your opportunity pipeline.</p></section>
      <div className="card">
        <div className="form">
          <input className="input" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="dentists" aria-label="Business keyword" />
          <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="New York, NY" aria-label="Location" />
          <button className="btn" onClick={run} disabled={loading}>{loading ? <><span className="spinner" />Searching…</> : 'Find Leads'}</button>
        </div>
        {error && <div className="error">{error}</div>}
        <p className="muted search-source">Source: {source === 'auto' ? 'Automatic provider selection' : source === 'google' ? 'Google Maps / Places' : 'OpenStreetMap'} · Change this in Settings.</p>
      </div>

      {loading && <div className="card results-card"><div className="skeleton-line wide" /><div className="skeleton-line" /><div className="skeleton-line" /><div className="skeleton-line" /></div>}
      {!loading && searched && rows.length === 0 && <div className="card empty"><h2>No leads found</h2><p>Try a broader business keyword or nearby location.</p></div>}
      {!loading && rows.length > 0 && <div className="card tablewrap results-card">
        <div className="cardhead"><div><h2>Search results</h2><p className="muted">{rows.length} businesses found</p></div><span className="pill">{source === 'osm' || source === 'openstreetmap' ? 'OSM Discovered' : source === 'auto' ? 'Auto' : 'Google Discovered'}</span></div>
        <table className="table"><thead><tr><th>Business Name</th><th>Address / Location</th><th>Website</th><th>Phone / Contact</th><th>Google Rating</th><th>Action</th></tr></thead>
          <tbody>{rows.map(lead => <tr key={lead.id}><td><b>{lead.name}</b></td><td>{lead.location}</td><td>{lead.website ? <a className="table-link" href={lead.website} target="_blank" rel="noreferrer">Visit website</a> : <span className="muted">Not found</span>}</td><td>{lead.phone || lead.email || <span className="muted">Not found</span>}</td><td>{lead.rating ? `${lead.rating} ★` : '—'}</td><td><div className="lead-actions"><Link className="btn secondary" href={`/leads?id=${encodeURIComponent(lead.id)}`}>Find contacts</Link><button className="btn secondary" onClick={() => addToOpportunities(lead.id)} disabled={added.includes(lead.id)}>{added.includes(lead.id) ? 'Added' : 'Add to Opportunities'}</button></div></td></tr>)}</tbody>
        </table>
      </div>}
    </>
  );
}
