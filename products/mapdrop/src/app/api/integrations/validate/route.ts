import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { datasetUrl, mapId } = body;

    if (!datasetUrl || !mapId) {
      return NextResponse.json({ success: false, error: 'datasetUrl and mapId required' }, { status: 400 });
    }

    // TODO: wire up GeoLint integration client once the shared package is publishable
    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        score: 100,
        grade: 'A',
        issues: [],
        reportUrl: '',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
