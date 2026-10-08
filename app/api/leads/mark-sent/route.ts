import {NextResponse} from 'next/server';
import {z} from 'zod';
import {markContacted} from '@/lib/store';

const schema = z.object({id: z.string().min(1), name: z.string().min(1)});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'Invalid request'}, {status: 400});
  markContacted(parsed.data.id, parsed.data.name);
  return NextResponse.json({success: true});
}
