import {NextResponse} from 'next/server';
import {z} from 'zod';
import {demoLeads} from '@/lib/demo';
import {searchPlaces} from '@/lib/providers-places';
import {searchPlacesOSM} from '@/lib/providers-osm';
import {getContactedIds, cacheLeads} from '@/lib/store';
import {Lead, DiscoverySource} from '@/lib/types';
import {getCachedLeads} from '@/lib/store';
import {searchOSM} from '@/lib/providers/osm';

export async function GET() {
  return NextResponse.json({leads: getCachedLeads()});
}

const schema = z.object({
  keyword: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(120),
  source: z.enum(['auto', 'google', 'osm', 'openstreetmap']).default('auto'),
});

type RawPlace = {
  placeId: string;
  name: string;
  location: string;
  website: string | null;
  rating: number | null;
  reviews: number | null;
  mapsUrl: string | null;
  phone: string | null;
  types: string[];
  source?: string;
};

function buildLead(place: RawPlace, index: number): Lead {
  return {
    id: place.placeId,
    name: place.name,
    location: place.location,
    website: place.website,
    rating: place.rating,
    reviews: place.reviews,
    email: null, // Neither Google Places nor OpenStreetMap expose business emails — that's a separate step, not built yet.
    score: place.website ? 50 : 75,
    opportunity: place.website ? 'Medium' : 'High',
    findings: place.website
      ? ['Website discovered; run the SEO audit to identify specific opportunities.']
      : ['No website URL returned by discovery. This is a potential website opportunity.'],
    mapsUrl: place.mapsUrl,
    phone: place.phone,
    types: place.types,
    rank: index + 1,
    source: place.source || 'Google Places',
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'Invalid search'}, {status: 400});

  const contactedIds = getContactedIds();

  const source: DiscoverySource = parsed.data.source === 'openstreetmap' ? 'osm' : parsed.data.source;
  if (source === 'google' && !process.env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({error: 'Google Places is selected, but GOOGLE_MAPS_API_KEY is not configured'}, {status: 503});
  }
  const useGoogle = source === 'google' || (source === 'auto' && Boolean(process.env.GOOGLE_MAPS_API_KEY));

  if (source === 'osm' || !useGoogle) {
    try {
      const places = source === 'osm' ? await searchOSM(parsed.data.keyword, parsed.data.location, 20) : await searchPlacesOSM(parsed.data.keyword, parsed.data.location, 20);
      if (places.length === 0) throw new Error('No results from OpenStreetMap for this search');
      const leads = places.map((place, index) => buildLead(place, index));
      cacheLeads(leads);
      const filtered = leads.filter(l => !contactedIds.has(l.id));
      return NextResponse.json({mode: 'live', source: source === 'osm' ? 'OpenStreetMap' : 'openstreetmap', query: parsed.data, leads: filtered});
    } catch (error) {
      const demo = demoLeads.map(x => ({...x, location: parsed.data.location}));
      cacheLeads(demo);
      const filtered = demo.filter(l => !contactedIds.has(l.id));
      const message = error instanceof Error ? error.message : 'OpenStreetMap search failed';
      return NextResponse.json({mode: 'demo', source: 'sample', note: message, query: parsed.data, leads: filtered});
    }
  }

  try {
    const places = await searchPlaces(parsed.data.keyword, parsed.data.location, 20);
    const leads = places.map((place, index) => buildLead(place, index));
    cacheLeads(leads);
    const filtered = leads.filter(l => !contactedIds.has(l.id));
    return NextResponse.json({mode: 'live', source: 'google', query: parsed.data, leads: filtered});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Places discovery failed';
    return NextResponse.json({error: message}, {status: 502});
  }
}
