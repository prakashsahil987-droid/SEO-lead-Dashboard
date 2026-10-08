import {NextResponse} from 'next/server';
import {getContacted} from '@/lib/store';

export async function GET() {
  return NextResponse.json({entries: getContacted()});
}
