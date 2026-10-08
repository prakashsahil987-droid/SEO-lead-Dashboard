import {z} from 'zod';

const placeSchema = z.object({
  id: z.string(),
  displayName: z.object({text: z.string()}).optional(),
  formattedAddress: z.string().optional(),
  websiteUri: z.string().url().optional(),
  googleMapsUri: z.string().url().optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  nationalPhoneNumber: z.string().optional(),
  types: z.array(z.string()).optional(),
});

const responseSchema = z.object({places: z.array(placeSchema).default([]), nextPageToken: z.string().optional()});

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

export async function searchPlaces(keyword: string, location: string, maxResults = 20): Promise<DiscoveredPlace[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.websiteUri',
        'places.googleMapsUri',
        'places.rating',
        'places.userRatingCount',
        'places.nationalPhoneNumber',
        'places.types',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: `${keyword} in ${location}`,
      maxResultCount: Math.min(Math.max(maxResults, 1), 20),
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Places API request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }

  const data = responseSchema.parse(await response.json());
  return data.places.map((place) => ({
    placeId: place.id,
    name: place.displayName?.text ?? 'Unnamed business',
    location: place.formattedAddress ?? location,
    website: place.websiteUri ?? null,
    mapsUrl: place.googleMapsUri ?? null,
    rating: place.rating ?? null,
    reviews: place.userRatingCount ?? null,
    phone: place.nationalPhoneNumber ?? null,
    types: place.types ?? [],
  }));
}
