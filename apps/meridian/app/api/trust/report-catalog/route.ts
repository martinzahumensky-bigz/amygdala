import { NextResponse } from 'next/server';

const PLATFORM_URL = process.env.PLATFORM_URL || 'http://localhost:3002';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appUrl = searchParams.get('appUrl');

  if (!appUrl) {
    return NextResponse.json(
      { error: 'appUrl is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch report from Platform catalog
    const response = await fetch(
      `${PLATFORM_URL}/api/reports?application=meridian&appUrl=${encodeURIComponent(appUrl)}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch report from catalog' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      report: data.report || null,
    });
  } catch (err) {
    console.error('Report catalog API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch report' },
      { status: 500 }
    );
  }
}
