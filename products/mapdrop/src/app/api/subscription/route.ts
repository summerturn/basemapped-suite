import { NextResponse } from 'next/server';
import { auth } from '@/lib/clerk-stub/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ tier: 'free' });
  }
  return NextResponse.json({ tier: 'free' });
}
