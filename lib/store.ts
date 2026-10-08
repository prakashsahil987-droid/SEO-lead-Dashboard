import fs from 'fs';
import path from 'path';
import {Lead} from './types';

// Local, file-based storage. No external database needed for now.
// Everything lives in /data inside the project (gitignored — it's your personal lead list).
const DATA_DIR = path.join(process.cwd(), 'data');
const CONTACTED_PATH = path.join(DATA_DIR, 'contacted.json');
const CACHE_PATH = path.join(DATA_DIR, 'leads-cache.json');

type ContactedEntry = {id: string; name: string; contactedAt: string};

export type {ContactedEntry};

function ensureFile(filePath: string, defaultContent: string): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive: true});
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, defaultContent, 'utf-8');
}

export function getContactedIds(): Set<string> {
  ensureFile(CONTACTED_PATH, '[]');
  const entries: ContactedEntry[] = JSON.parse(fs.readFileSync(CONTACTED_PATH, 'utf-8') || '[]');
  return new Set(entries.map(e => e.id));
}

export function getContacted(): ContactedEntry[] {
  ensureFile(CONTACTED_PATH, '[]');
  return JSON.parse(fs.readFileSync(CONTACTED_PATH, 'utf-8') || '[]') as ContactedEntry[];
}

export function markContacted(id: string, name: string): void {
  ensureFile(CONTACTED_PATH, '[]');
  const entries: ContactedEntry[] = JSON.parse(fs.readFileSync(CONTACTED_PATH, 'utf-8') || '[]');
  if (!entries.find(e => e.id === id)) {
    entries.push({id, name, contactedAt: new Date().toISOString()});
    fs.writeFileSync(CONTACTED_PATH, JSON.stringify(entries, null, 2), 'utf-8');
  }
}

// Search results are cached by id so the review page can look up a real
// business after you click "Review" (API routes don't otherwise remember
// anything between requests).
export function cacheLeads(leads: Lead[]): void {
  ensureFile(CACHE_PATH, '{}');
  const existing: Record<string, Lead> = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8') || '{}');
  for (const lead of leads) {
    const previous = existing[lead.id];
    const sameWebsite = previous?.website === lead.website;
    existing[lead.id] = {
      ...lead,
      ...(sameWebsite && previous.publicContacts ? {publicContacts: previous.publicContacts} : {}),
      email: lead.email || (sameWebsite ? previous?.email : null) || null,
      phone: lead.phone || (sameWebsite ? previous?.phone : null) || null,
    };
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(existing, null, 2), 'utf-8');
}

export function getCachedLead(id: string): Lead | null {
  ensureFile(CACHE_PATH, '{}');
  const existing: Record<string, Lead> = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8') || '{}');
  return existing[id] || null;
}

export function updateCachedLead(lead: Lead): void {
  ensureFile(CACHE_PATH, '{}');
  const existing: Record<string, Lead> = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8') || '{}');
  existing[lead.id] = lead;
  fs.writeFileSync(CACHE_PATH, JSON.stringify(existing, null, 2), 'utf-8');
}

export function getCachedLeads(): Lead[] {
  ensureFile(CACHE_PATH, '{}');
  return Object.values(JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8') || '{}') as Record<string, Lead>);
}
