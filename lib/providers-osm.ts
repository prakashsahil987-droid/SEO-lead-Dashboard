// Free, no-API-key business discovery using OpenStreetMap data.
// Used automatically when GOOGLE_MAPS_API_KEY isn't set.
// Courtesy-use APIs (Nominatim + Overpass) — fine for personal/dev volume,
// see https://operations.osmfoundation.org/policies/nominatim/ before heavy production use.

export type DiscoveredPlace = {
  placeId: string;
  name: string;
  location: string;
  website: string | null;
  mapsUrl: string | null;
  rating: number | null;
  reviews: number | null;
  phone: string | null;
  types: string[];
};

// Maps common search keywords to OpenStreetMap tags. Add more as you need them.
const KEYWORD_TAGS: Record<string, string[]> = {
  dentist: ['amenity=dentist'],
  doctor: ['amenity=doctors'],
  clinic: ['amenity=clinic'],
  hospital: ['amenity=hospital'],
  restaurant: ['amenity=restaurant'],
  cafe: ['amenity=cafe'],
  hairdresser: ['shop=hairdresser'],
  salon: ['shop=hairdresser', 'shop=beauty'],
  gym: ['leisure=fitness_centre'],
  lawyer: ['office=lawyer'],
  plumber: ['craft=plumber'],
  electrician: ['craft=electrician'],
  hotel: ['tourism=hotel'],
  bakery: ['shop=bakery'],
  accountant: ['office=accountant'],
  veterinarian: ['amenity=veterinary'],
  chiropractor: ['healthcare=chiropractor'],
};

function tagsForKeyword(keyword: string): string[] {
  const key = keyword.trim().toLowerCase();
  if (KEYWORD_TAGS[key]) return KEYWORD_TAGS[key];
  // Unknown keyword: try it directly as an amenity value (works for many OSM-standard terms).
  return [`amenity=${key.replace(/\s+/g, '_')}`];
}

async function geocode(location: string): Promise<{lat: number; lon: number} | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`;
  const res = await fetch(url, {
    headers: {'User-Agent': 'seo-lead-intelligence/0.1 (local dev tool)'},
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return {lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon)};
}

export async function searchPlacesOSM(keyword: string, location: string, maxResults = 20): Promise<DiscoveredPlace[]> {
  const point = await geocode(location);
  if (!point) throw new Error(`Could not find location on OpenStreetMap: ${location}`);

  const tags = tagsForKeyword(keyword);
  const radiusMeters = 15000;
  const clauses = tags
    .map(tag => {
      const [k, v] = tag.split('=');
      return `node["${k}"="${v}"](around:${radiusMeters},${point.lat},${point.lon});`;
    })
    .join('\n');

  const query = `[out:json][timeout:25];(${clauses});out center ${maxResults};`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {'Content-Type': 'text/plain'},
    body: query,
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenStreetMap request failed (${res.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }

  const data = await res.json();
  const elements: any[] = Array.isArray(data.elements) ? data.elements : [];

  return elements
    .slice(0, maxResults)
    .map((el): DiscoveredPlace => {
      const t = el.tags || {};
      const addressParts = [t['addr:housenumber'], t['addr:street'], t['addr:city'] || location].filter(Boolean);
      return {
        placeId: `osm-${el.type}-${el.id}`,
        name: t.name || 'Unnamed business',
        location: addressParts.length ? addressParts.join(' ') : location,
        website: t.website || t['contact:website'] || null,
        mapsUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        rating: null,
        reviews: null,
        phone: t.phone || t['contact:phone'] || null,
        types: [keyword],
      };
    })
    .filter(p => p.name !== 'Unnamed business');
}
