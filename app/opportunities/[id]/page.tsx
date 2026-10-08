import {redirect} from 'next/navigation';

export default async function OpportunityDetail({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  redirect(`/leads?id=${encodeURIComponent(id)}`);
}
