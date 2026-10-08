'use client';

import {useEffect, useState} from 'react';
import {useToast} from '@/app/components/toast-provider';

const providers = [
  {key: 'GOOGLE_MAPS_API_KEY', label: 'Google Maps / Places', hint: 'Used for local business discovery.'},
  {key: 'AI_API_KEY', label: 'AI drafting provider', hint: 'Used to generate personalized drafts.'},
  {key: 'EMAIL_PROVIDER_KEY', label: 'Email provider', hint: 'Used for the future sending integration.'},
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, 'Connected' | 'Needs configuration'>>({});
  const [source, setSource] = useState('auto');
  const {showToast} = useToast();
  useEffect(() => {
    const saved = window.localStorage.getItem('discovery-source');
    if (saved === 'google' || saved === 'osm' || saved === 'openstreetmap' || saved === 'auto') setSource(saved);
  }, []);

  const testConnection = (key: string) => {
    setTesting(key);
    window.setTimeout(() => {
      setResults(current => ({...current, [key]: values[key] ? 'Connected' : 'Needs configuration'}));
      setTesting(null);
    }, 650);
  };

  return <><section className="hero"><h1>Settings</h1><p>Manage discovery sources and prepare secure provider integrations.</p></section>
    <div className="card"><div className="cardhead"><div><h2>Business discovery source</h2><p className="muted">Choose which server-side provider powers new searches.</p></div><a className="btn secondary" href="/">Back to search</a></div>
      <div className="settings-list">{[['auto', 'Automatic', 'Use Google when configured, otherwise OpenStreetMap.', 'Recommended'], ['google', 'Google Maps / Places', 'Best coverage; requires a server-side key.', 'API ready'], ['osm', 'OpenStreetMap (Overpass API)', 'Free open-source discovery through Nominatim and Overpass.', 'Ready (Free / No API Key required)']].map(([value, label, description, status]) => <label className={'setting-option' + (source === value ? ' selected' : '')} key={value}><input type="radio" name="source" checked={source === value} onChange={() => {setSource(value); window.localStorage.setItem('discovery-source', value); showToast(`${label} selected`);}} /><span><b>{label}</b><small>{description}</small></span><em>{status}</em></label>)}</div>
    </div>
    <div className="card settings-card"><h2>Provider API keys</h2><p className="muted">Values are masked in the UI and are only demo state until connected to your server environment.</p>
      <div className="provider-list">{providers.map(provider => <div className="provider-row" key={provider.key}><div><b>{provider.label}</b><small>{provider.hint}</small></div><div className="secret-input"><input className="input" type={visible[provider.key] ? 'text' : 'password'} placeholder={provider.key} value={values[provider.key] || ''} onChange={event => setValues(current => ({...current, [provider.key]: event.target.value}))} /><button className="icon-btn" onClick={() => setVisible(current => ({...current, [provider.key]: !current[provider.key]}))} aria-label={visible[provider.key] ? 'Hide key' : 'Show key'}>{visible[provider.key] ? 'Hide' : 'Show'}</button></div><button className="btn secondary test-btn" onClick={() => testConnection(provider.key)} disabled={testing === provider.key}>{testing === provider.key ? <><span className="spinner" />Testing…</> : 'Test Connection'}</button>{results[provider.key] && <span className={results[provider.key] === 'Connected' ? 'status-pill connected' : 'status-pill failed'}>{results[provider.key]}</span>}</div>)}</div>
    </div>
  </>;
}
