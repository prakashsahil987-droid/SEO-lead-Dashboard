import {NextResponse} from 'next/server';
import {findPublicContacts} from '@/lib/public-contacts';
import {getCachedLead, updateCachedLead} from '@/lib/store';

export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const lead = getCachedLead(id);
  if (!lead) return NextResponse.json({error: 'Lead not found'}, {status: 404});
  if (!lead.website) return NextResponse.json({error: 'This lead has no website to check'}, {status: 422});

  try {
    const publicContacts = await findPublicContacts(lead.website);
    const updatedLead = {
      ...lead,
      publicContacts,
      email: lead.email || publicContacts.emails[0]?.value || null,
      phone: lead.phone || publicContacts.phones[0]?.value || null,
    };
    updateCachedLead(updatedLead);
    return NextResponse.json({lead: updatedLead});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Public contact discovery failed';
    return NextResponse.json({error: message}, {status: 502});
  }
}
