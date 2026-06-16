import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Clerk is disabled until production publishable/secret keys are configured.
// All MapDrop routes are treated as public for now; the dashboard uses mock data.
export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
