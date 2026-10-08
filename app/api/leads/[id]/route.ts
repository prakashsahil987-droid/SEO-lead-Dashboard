import {NextResponse} from 'next/server';
import {getCachedLead} from '@/lib/store';
import {demoLeads} from '@/lib/demo';

// Next.js 15+/16: dynamic route params are async and must be awaited.
export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const cached = getCachedLead(id);
  if (cached) return NextResponse.json({lead: cached});
  const demo = demoLeads.find(l => l.id === id);
  if (demo) return NextResponse.json({lead: demo});
  return NextResponse.json({error: 'Lead not found'}, {status: 404});
}
