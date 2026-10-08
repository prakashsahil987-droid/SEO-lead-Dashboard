'use client';
import {useEffect, useState} from 'react';

type ContactedEntry = {id: string; name: string; contactedAt: string};

export default function SentList() {
  const [entries, setEntries] = useState<ContactedEntry[]>([]);
  useEffect(() => { fetch('/api/contacted').then(r => r.json()).then(d => setEntries(d.entries || [])).catch(() => setEntries([])); }, []);
  if (!entries.length) return <div className="card empty">No contacted businesses yet.</div>;
  return <div className="card tablewrap"><table className="table"><thead><tr><th>Business</th><th>Contacted</th><th>Status</th></tr></thead><tbody>{entries.map(entry => <tr key={entry.id}><td><b>{entry.name}</b></td><td>{new Date(entry.contactedAt).toLocaleString()}</td><td><span className="status-pill sent-status">Sent</span></td></tr>)}</tbody></table></div>;
}
