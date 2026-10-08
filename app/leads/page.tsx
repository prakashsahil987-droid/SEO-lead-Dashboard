'use client';
import {Suspense, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {demoLeads} from '@/lib/demo';
import {Lead} from '@/lib/types';
import {WebsiteAudit} from '@/lib/audit';
import {useToast} from '@/app/components/toast-provider';

function LeadsContent() {
  const params = useSearchParams();
  const id = params.get('id');
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [audit, setAudit] = useState<WebsiteAudit | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [findingContacts, setFindingContacts] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Lead[]>([]);
  const [draft, setDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [editingDraft, setEditingDraft] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const {showToast} = useToast();

  useEffect(() => {
    if (!id) {
      fetch('/api/leads')
        .then(r => r.json())
        .then(d => setOpportunities(d.leads?.length ? d.leads : demoLeads))
        .catch(() => setOpportunities(demoLeads));
      setLoading(false);
      return;
    }

    fetch(`/api/leads/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => {
        const nextLead = d.lead || demoLeads[0];
        setLead(nextLead);
        setSubject(`A few SEO opportunities for ${nextLead.name}`);
        setDraft(`Hi, I was looking at ${nextLead.name} and noticed a few SEO opportunities on the site. I put together a short audit with practical improvements. Would you like me to send it over?`);
      })
      .catch(() => {
        setLead(demoLeads[0]);
        setSubject(`A few SEO opportunities for ${demoLeads[0].name}`);
        setDraft(`Hi, I was looking at ${demoLeads[0].name} and noticed a few SEO opportunities on the site. I put together a short audit with practical improvements. Would you like me to send it over?`);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const runAudit = async () => {
    if (!lead?.website) return;
    setAuditing(true);
    setAuditError(null);
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(lead.id)}/audit`, {method: 'POST'});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Website audit failed');
      setAudit(data.audit);
      showToast('Website audit completed');
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : 'Website audit failed');
    } finally {
      setAuditing(false);
    }

  };

  const findContacts = async () => {
    if (!lead?.website) return;
    setFindingContacts(true);
    setContactError(null);
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(lead.id)}/contacts`, {method: 'POST'});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Public contact discovery failed');
      setLead(data.lead);
      showToast('Public contact check completed');
    } catch (error) {
      setContactError(error instanceof Error ? error.message : 'Public contact discovery failed');
    } finally {
      setFindingContacts(false);
    }
  };

  const approve = async () => {
    if (!lead) return;
    setSending(true);
    try {
      await fetch('/api/leads/mark-sent', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: lead.id, name: lead.name}),
      });
      setSent(true);
      setShowSuccess(true);
      showToast('Draft approved and moved to Sent');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;
  if (!id) return (
    <>
      <section className="hero"><h1>Opportunities</h1><p>Review discovered businesses and prioritize the strongest SEO opportunities.</p></section>
      <div className="card tablewrap"><table className="table"><thead><tr><th>Business</th><th>Location</th><th>Website</th><th>Opportunity</th><th>Score</th><th /></tr></thead><tbody>{opportunities.map(item => <tr key={item.id}><td><b>{item.name}</b></td><td>{item.location}</td><td>{item.website ? 'Found' : 'Missing'}</td><td><span className="pill">{item.opportunity}</span></td><td className={'score '+(item.score >= 75 ? 'high' : item.score >= 60 ? 'medium' : 'low')}>{item.score}</td><td><a className="btn secondary" href={`/leads?id=${encodeURIComponent(item.id)}`}>Review</a></td></tr>)}</tbody></table></div>
    </>
  );
  if (!lead) return <p className="muted">Lead not found.</p>;

  return (
    <>
      <section className="hero">
        <div className="detail-heading"><div><h1>{lead.name}</h1><p>{lead.location} · {lead.website || 'No website discovered'}</p></div><div className="export-wrap"><button className="btn secondary" onClick={() => setShowExport(value => !value)}>Export Audit ▾</button>{showExport && <div className="export-menu"><button onClick={() => showToast('PDF export is ready for provider integration')}>Download PDF</button><button onClick={() => {navigator.clipboard?.writeText(window.location.href); showToast('Shareable link copied')}}>Copy Shareable Link</button><button onClick={() => {navigator.clipboard?.writeText(JSON.stringify(audit || {}, null, 2)); showToast('Audit JSON copied')}}>Export JSON</button></div>}</div></div>
        <div className="metadata-badges"><span className="meta-badge">{lead.phone || 'Phone not found'}</span><span className="meta-badge">{lead.location}</span><span className="meta-badge">{lead.types?.[0] || 'Local business'}</span>{lead.mapsUrl && <a className="meta-badge" href={lead.mapsUrl} target="_blank" rel="noreferrer">Google Maps ↗</a>}</div>
      </section>
      <div className="stats">
        <div className="stat"><span className="muted">Opportunity score</span><b>{lead.score}/100</b></div>
        <div className="stat"><span className="muted">Google rating</span><b>{lead.rating ?? '—'}</b></div>
        <div className="stat"><span className="muted">Reviews</span><b>{lead.reviews ?? '—'}</b></div>
        <div className="stat"><span className="muted">Email</span><b>{lead.email ? 'Found' : '—'}</b></div>
      </div>
      <div className="card contact-card">
        <div className="cardhead"><div><h2>Public business contact info</h2><p className="muted">Checks the business website and linked contact/about pages. Social platforms themselves are not scraped.</p></div><button className="btn secondary" onClick={findContacts} disabled={!lead.website || findingContacts}>{findingContacts && <span className="spinner dark" />}{findingContacts ? 'Checking…' : lead.publicContacts ? 'Check again' : 'Find public contacts'}</button></div>
        {contactError && <div className="error">{contactError}</div>}
        {lead.publicContacts ? (
          <div className="contact-results">
            {lead.publicContacts.emails.length > 0 && <div className="contact-group"><b>Email</b>{lead.publicContacts.emails.map(item => <div className="contact-value" key={item.value}><a href={`mailto:${item.value}`}>{item.value}</a><a className="muted contact-source" href={item.source} target="_blank" rel="noreferrer">Source page ↗</a></div>)}</div>}
            {lead.publicContacts.phones.length > 0 && <div className="contact-group"><b>Phone</b>{lead.publicContacts.phones.map(item => <div className="contact-value" key={item.value}><a href={`tel:${item.value}`}>{item.value}</a><a className="muted contact-source" href={item.source} target="_blank" rel="noreferrer">Source page ↗</a></div>)}</div>}
            {lead.publicContacts.socials.length > 0 && <div className="contact-group"><b>Social profiles</b>{lead.publicContacts.socials.map(item => <div className="contact-value" key={`${item.platform}:${item.url}`}><a href={item.url} target="_blank" rel="noreferrer">{item.platform} ↗</a><a className="muted contact-source" href={item.source} target="_blank" rel="noreferrer">Source page ↗</a></div>)}</div>}
            {!lead.publicContacts.emails.length && !lead.publicContacts.phones.length && !lead.publicContacts.socials.length && <p className="muted">No public email, phone, or social profile links were found on the checked pages.</p>}
            {lead.publicContacts.warnings.map(warning => <p className="muted" key={warning}>Could not check {warning}</p>)}
            <small className="muted">Checked {new Date(lead.publicContacts.checkedAt).toISOString()}</small>
          </div>
        ) : <p className="muted">{lead.website ? 'No contact information checked yet.' : 'No website was found for this business.'}</p>}
      </div>
      <div className="grid2">
        <div className="card">
          <div className="cardhead"><h2>Technical audit breakdown</h2><button className="btn secondary" onClick={runAudit} disabled={!lead.website || auditing}>{auditing && <span className="spinner dark" />}{auditing ? 'Auditing…' : 'Run website audit'}</button></div>
          {!lead.website && <p className="muted">No website was discovered for this business.</p>}
          {auditError && <div className="error">{auditError}</div>}
          {(audit?.findings || lead.findings.map((detail) => ({label: detail, status: 'warning' as const, detail: 'Discovery signal; verify during audit.'}))).map((finding, i) => (
            <div className="finding" key={i}><span><b>{finding.label}</b><small>{finding.detail}</small></span><span className={finding.status === 'pass' ? 'high' : finding.status === 'warning' ? 'medium' : 'low'}>{finding.status}</span></div>
          ))}
          {audit && <p className="audit-score">Technical opportunity score: <b>{audit.score}/100</b></p>}
          <div className="audit-grid">
            {['HTTP status & page load', 'Title tag', 'Meta description', 'H1 tag', 'Mobile responsiveness', 'SSL status'].map(label => {
              const finding = audit?.findings.find(item => item.label.toLowerCase().includes(label.split(' ')[0].toLowerCase()));
              return <div className="audit-item" key={label}><span>{label}</span><b className={finding?.status === 'fail' ? 'low' : finding?.status === 'warning' ? 'medium' : finding ? 'high' : 'muted'}>{finding ? finding.status === 'pass' ? 'Good' : finding.status : 'Pending'}</b></div>;
            })}
          </div>
        </div>
        <div className="card">
          <h2>AI outreach draft</h2>
          {sent ? (
            <><span className="status-pill sent-status">Sent</span><p className="muted">Marked as contacted — {lead.name} won&apos;t show up in future searches.</p></>
          ) : (
            <>
              <p className="muted">The final version will be generated from verified audit findings only.</p>
              {editingDraft ? <div className="draft-fields"><label>Subject<input className="input" value={subject} onChange={e => setSubject(e.target.value)} /></label><label>Message<textarea className="textarea" value={draft} onChange={e => setDraft(e.target.value)} rows={7} /></label></div> : <div className="notice"><b>{subject}</b><br /><br />{draft}</div>}
              <br />
              <button className="btn secondary" onClick={() => {setEditingDraft(value => !value); if (editingDraft) showToast('Draft updated')}} disabled={sending}>{editingDraft ? 'Save draft' : 'Edit draft'}</button>{' '}
              <button className="btn" onClick={approve} disabled={sending}>{sending ? 'Marking…' : 'Mark as contacted'}</button>
            </>
          )}
        </div>
      </div>
      {showSuccess && <div className="toast success-toast">Lead moved to Sent</div>}
    </>
  );
}

export default function Leads() {
  return <Suspense fallback={<p className="muted">Loading…</p>}><LeadsContent /></Suspense>;
}
