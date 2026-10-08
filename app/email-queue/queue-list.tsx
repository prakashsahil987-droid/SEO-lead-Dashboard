'use client';

import {useEffect, useState} from 'react';
import {Lead} from '@/lib/types';

type QueueLead = Lead & {status: 'Draft' | 'Queued' | 'Failed'};

export default function QueueList() {
  const [leads, setLeads] = useState<QueueLead[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([fetch('/api/leads').then(r => r.json()), fetch('/api/contacted').then(r => r.json())])
      .then(([leadData, contactedData]) => {
        const contacted = new Set((contactedData.entries || []).map((entry: {id: string}) => entry.id));
        setLeads((leadData.leads || []).filter((lead: Lead) => lead.email && !contacted.has(lead.id)).map((lead: Lead) => ({...lead, status: 'Draft'})));
      }).catch(() => setLeads([]));
  }, []);

  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const updateStatus = (status: 'Queued' | 'Draft', ids = selected) => {
    setBusy(true);
    window.setTimeout(() => {
      setLeads(current => current.map(lead => ids.includes(lead.id) ? {...lead, status} : lead));
      setSelected([]);
      setBusy(false);
    }, 450);
  };

  if (!leads.length) return <div className="card empty"><h2>Email queue is clear</h2><p>No leads with a public email are waiting for approval.</p></div>;
  const allSelected = selected.length === leads.length;
  return <div className="card tablewrap">
    <div className="queue-toolbar"><label className="check-label"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : leads.map(lead => lead.id))} /> Select all</label><span className="muted">{selected.length} selected</span><div className="toolbar-actions"><button className="btn secondary" disabled={!selected.length || busy} onClick={() => updateStatus('Queued')}>Approve Selected</button><button className="btn" disabled={busy} onClick={() => updateStatus('Queued', leads.map(lead => lead.id))}>{busy ? 'Updating…' : 'Send All Drafts'}</button></div></div>
    <table className="table"><thead><tr><th /><th>Business</th><th>Email</th><th>Opportunity</th><th>Status</th><th /></tr></thead><tbody>{leads.map(lead => <tr key={lead.id}><td><input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggle(lead.id)} /></td><td><b>{lead.name}</b></td><td>{lead.email}</td><td><span className="pill">{lead.opportunity}</span></td><td><span className={`status-pill ${lead.status.toLowerCase()}`}>{lead.status}</span></td><td><a className="btn secondary" href={`/leads?id=${encodeURIComponent(lead.id)}`}>Review draft</a></td></tr>)}</tbody></table>
  </div>;
}
