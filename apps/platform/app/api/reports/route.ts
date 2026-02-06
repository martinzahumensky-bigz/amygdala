import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = getAmygdalaClient();
  const { searchParams } = new URL(request.url);

  const application = searchParams.get('application');
  const appUrl = searchParams.get('appUrl');
  const id = searchParams.get('id');

  try {
    let query = supabase
      .from('assets')
      .select('*')
      .in('asset_type', ['report', 'dashboard', 'application_screen']);

    if (id) {
      query = query.eq('id', id);
    }

    if (application) {
      query = query.eq('application', application);
    }

    if (appUrl) {
      query = query.eq('app_url', appUrl);
    }

    const { data: reports, error } = await query.order('name');

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If single report requested, return just that
    if (id || appUrl) {
      const report = reports?.[0] || null;

      if (report && report.upstream_assets?.length > 0) {
        // Fetch trust data for source assets
        const { data: sourceAssets } = await supabase
          .from('assets')
          .select('id, name, trust_score_stars, trust_score_raw, fitness_status, quality_score')
          .in('id', report.upstream_assets);

        return NextResponse.json({
          success: true,
          report: {
            ...report,
            sourceAssets: sourceAssets || [],
          },
        });
      }

      return NextResponse.json({
        success: true,
        report,
      });
    }

    return NextResponse.json({
      success: true,
      reports: reports || [],
      total: reports?.length || 0,
    });
  } catch (err) {
    console.error('Reports API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
