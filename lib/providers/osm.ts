import {z} from 'zod';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'seo-lead-intelligence/0.1 (personal research dashboard)';

const geocodeSchema = z.array(z.object({
  lat: z.string(),
  lon: z.string(),
  boundingbox: z.array(z.string()).length(4).optional(),
}));

const overpassSchema = z.object({
  elements: z.array(z.object({
    type: z.enum(['node', 'way', 'relation']),
    id: z.number(),
    center: z.object({lat: z.number(), lon: z.number()}).optional(),
    tags: z.record(z.string(), z.string()).optional(),
  })).default([]),
});

export type OSMDiscoveredLead = {
  placeId: string;
  name: string;
  location: string;
  website: string | null;
  mapsUrl: string;
  rating: number | null;
  reviews: number | null;
  phone: string | null;
  types: string[];
  source: 'OpenStreetMap';
};

function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

async function geocode(location: string): Promise<{lat: number; lon: number; boundingBox: [number, number, number, number]}> {
  const params = new URLSearchParams({q: location, format: 'json', limit: '1'});
  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {'User-Agent': USER_AGENT, Accept: 'application/json'},
    cache: 'no-store',
    signal: timeoutSignal(8000),
  });
  if (!response.ok) throw new Error(`Nominatim returned HTTP ${response.status}`);
  const places = geocodeSchema.parse(await response.json());
  const place = places[0];
  if (!place) throw new Error(`Could not find location on OpenStreetMap: ${location}`);
  const boundingBox = place.boundingbox
    ? [Number(place.boundingbox[0]), Number(place.boundingbox[2]), Number(place.boundingbox[1]), Number(place.boundingbox[3])] as [number, number, number, number]
    : [Number(place.lat) - 0.1, Number(place.lon) - 0.1, Number(place.lat) + 0.1, Number(place.lon) + 0.1] as [number, number, number, number];
  if (boundingBox.some(value => !Number.isFinite(value))) throw new Error('Nominatim returned invalid coordinates');
  return {lat: Number(place.lat), lon: Number(place.lon), boundingBox};
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function queryTags(keyword: string): string {
  const term = escapeRegex(keyword.trim().toLowerCase());
  return [
    `nwr["name"~"${term}",i]`,
    `nwr["amenity"~"${term}",i]`,
    `nwr["shop"~"${term}",i]`,
    `nwr["office"~"${term}",i]`,
  ].join(';');
}

function addressFromTags(tags: Record<string, string>, fallback: string): string {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return [street, tags['addr:city'] || tags['addr:town'] || tags['addr:village'], tags['addr:postcode']].filter(Boolean).join(', ') || fallback;
}

export async function searchOSM(keyword: string, location: string, maxResults = 20): Promise<OSMDiscoveredLead[]> {
  const place = await geocode(location);
  const [south, west, north, east] = place.boundingBox;
  const query = `[out:json][timeout:25];(${queryTags(keyword)}(${south},${west},${north},${east}););out center tags;`;
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain', 'User-Agent': USER_AGENT, Accept: 'application/json'},
    body: query,
    cache: 'no-store',
    signal: timeoutSignal(30000),
  });
  if (!response.ok) throw new Error(`Overpass returned HTTP ${response.status}`);
  const data = overpassSchema.parse(await response.json());
  return data.elements.slice(0, Math.min(Math.max(maxResults, 1), 100)).map(element => {
    const tags = element.tags || {};
    const category = tags.amenity || tags.shop || tags.office || keyword;
    return {
      placeId: `osm-${element.type}-${element.id}`,
      name: tags.name || `${keyword} business`,
      location: addressFromTags(tags, location),
      website: tags.website || tags.url || tags['contact:website'] || null,
      mapsUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      rating: null,
      reviews: null,
      phone: tags.phone || tags['contact:phone'] || null,
      types: [category],
      source: 'OpenStreetMap' as const,
    };
  });
}
