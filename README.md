# SEO Lead Intelligence MVP

Private lead-generation dashboard for SEO prospecting.

## Current phase: real business discovery

Current flow:

`keyword + location -> Google Places API (New) or OpenStreetMap -> normalized business leads -> server-side website audit -> review`

The local workflow is usable without external credentials: Opportunities, Email Queue, Sent, and Settings are real pages; lead searches, cached leads, contact status, drafts, and website audits are wired to server routes. External discovery, email finding, AI copy generation, and email sending are intentionally left behind replaceable server-side integrations.

The Places API key is read only on the server. If `GOOGLE_MAPS_API_KEY` is missing, the app stays in demo mode.

Google Places Text Search (New) requires an explicit response field mask; this MVP requests only the fields needed for lead discovery. See the official Google documentation before production use.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your Google Places API (New) key to `.env.local` as `GOOGLE_MAPS_API_KEY`. Without it, the app uses OpenStreetMap for personal/development-volume discovery and falls back to sample data if that service is unavailable.

The website audit checks the discovered homepage for title, meta description, H1 structure, canonical URL, indexability, content depth, and a blog/content-section signal. It is intentionally evidence-based and does not claim to measure traffic, indexing, or ranking without Search Console or analytics data.

Lead review includes a public-contact check that reads the business homepage and up to four linked contact/about pages. It records publicly displayed business email addresses and phone numbers plus social profile links published by the business, with the source page for each result. It does not log in to, search, or scrape social networks. Only public HTTP(S) business websites are checked; private/local addresses, oversized pages, and excessive redirects are rejected.

## Next build stages

1. ~~Website crawler + deterministic SEO audit~~
2. ~~Opportunity scoring from verified findings~~
3. PostgreSQL persistence
4. External discovery providers and contact verification with source/confidence
5. AI personalization from verified findings only
6. Gmail OAuth + explicit human approval before sending
7. Authentication, suppression list, rate limits, audit logs, retention/deletion controls

## API replacement points

- Discovery: replace or extend `lib/providers-places.ts` and `lib/providers-osm.ts`.
- Contact discovery: `lib/public-contacts.ts` checks public website pages for published contact details and linked social profiles. Add a licensed provider only behind a server-side route, with source/confidence metadata.
- AI drafting: add a server provider behind a draft route; only pass verified audit findings.
- Sending: add Gmail or another provider behind a send route. Keep the current explicit review and contact-marking step as the safety gate.

Do not expose provider keys in `NEXT_PUBLIC_*` variables or call provider APIs directly from client components.
