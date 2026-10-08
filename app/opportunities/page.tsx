'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {demoLeads} from '@/lib/demo';
import {Lead} from '@/lib/types';

type AuditFilter = 'all' | 'audited' | 'pending';
type ScoreFilter = 'all' | 'high' | 'medium' | 'low';

export default function OpportunitiesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState('');
  const [score, setScore] = useState<ScoreFilter>('all');
  const [audit, setAudit] = useState<AuditFilter>('all');
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    fetch('/api/leads').then(response => response.json()).then(data => setLeads(data.leads?.length ? data.leads : demoLeads)).catch(() => setLeads(demoLeads));
    fetch('/api/contacted').then(response => response.json()).then(data => setSentCount(data.entries?.length || 0)).catch(() => setSentCount(0));
  }, []);

  const filtered = useMemo(() => leads.filter(lead => {
    const matchesQuery = `${lead.name} ${lead.location}`.toLowerCase().includes(query.toLowerCase());
    const matchesScore = score === 'all' || (score === 'high' && lead.score >= 80) || (score === 'medium' && lead.score >= 50 && lead.score < 80) || (score === 'low' && lead.score < 50);
    const matchesAudit = audit === 'all' || (audit === 'pending' && !lead.website) || (audit === 'audited' && Boolean(lead.website));
    return matchesQuery && matchesScore && matchesAudit;
  }), [audit, leads, query, score]);

  return <><section className="hero"><h1>Opportunities</h1><p>Prioritize discovered businesses and move qualified prospects into outreach.</p></section>
    <div className="kpi-grid"><div className="kpi-card"><span className="muted">Total discovered leads</span><b>{leads.length}</b><small>Across your searches</small></div><div className="kpi-card"><span className="muted">High opportunity leads</span><b>{leads.filter(lead => lead.score >= 80).length}</b><small>Score 80+</small></div><div className="kpi-card"><span className="muted">Outreaches sent</span><b>{sentCount}</b><small>Marked as contacted</small></div></div>
    <div className="card opportunity-toolbar"><input className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search business or location…" /><select className="input select" value={score} onChange={event => setScore(event.target.value as ScoreFilter)}><option value="all">All scores</option><option value="high">High Opportunity 80+</option><option value="medium">Medium 50–79</option><option value="low">Low under 50</option></select><div className="filter-pills">{(['all', 'audited', 'pending'] as AuditFilter[]).map(value => <button className={`filter-pill ${audit === value ? 'active' : ''}`} key={value} onClick={() => setAudit(value)}>{value === 'all' ? 'All' : value === 'audited' ? 'Audited' : 'Pending Audit'}</button>)}</div></div>
    <div className="card tablewrap"><table className="table"><thead><tr><th>Business</th><th>Location</th><th>Website</th><th>Opportunity</th><th>Score</th><th>Audit</th><th /></tr></thead><tbody>{filtered.map(lead => <tr key={lead.id}><td><b>{lead.name}</b></td><td>{lead.location}</td><td>{lead.website ? 'Found' : 'Missing'}</td><td><span className="pill">{lead.opportunity}</span></td><td className={'score ' + (lead.score >= 80 ? 'high' : lead.score >= 50 ? 'medium' : 'low')}>{lead.score}</td><td><span className={`status-pill ${lead.website ? 'connected' : 'draft'}`}>{lead.website ? 'Audited' : 'Pending'}</span></td><td><Link className="btn secondary" href={`/opportunities/${encodeURIComponent(lead.id)}`}>Review</Link></td></tr>)}</tbody></table>{!filtered.length && <div className="empty">No opportunities match these filters.</div>}</div>
  </>;
}
