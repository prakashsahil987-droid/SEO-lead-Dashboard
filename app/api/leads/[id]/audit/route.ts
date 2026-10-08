import {NextResponse} from 'next/server';
import {auditWebsite} from '@/lib/audit';
import {getCachedLead} from '@/lib/store';

export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const lead = getCachedLead(id);
  if (!lead) return NextResponse.json({error: 'Lead not found'}, {status: 404});
  if (!lead.website) return NextResponse.json({error: 'This lead has no website to audit'}, {status: 422});
  try {
    const audit = await auditWebsite(lead.website);
    return NextResponse.json({audit});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Website audit failed';
    return NextResponse.json({error: message}, {status: 502});
  }
}
