import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const layer = searchParams.get('layer');
    const assetType = searchParams.get('type');
    const fitnessStatus = searchParams.get('fitness');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getAmygdalaClient();

    // Build the query
    let query = supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (layer) {
      query = query.eq('layer', layer);
    }

    if (assetType) {
      query = query.eq('asset_type', assetType);
    }

    if (fitnessStatus) {
      query = query.eq('fitness_status', fitnessStatus);
    }

    const { data: assets, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch assets: ${error.message}`);
    }

    // Get counts by layer
    const { data: layerCounts } = await supabase
      .from('assets')
      .select('layer')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        data?.forEach((a) => {
          counts[a.layer] = (counts[a.layer] || 0) + 1;
        });
        return { data: counts };
      });

    // Get counts by fitness status
    const { data: fitnessCounts } = await supabase
      .from('assets')
      .select('fitness_status')
      .then(({ data }) => {
        const counts: Record<string, number> = { green: 0, amber: 0, red: 0 };
        data?.forEach((a) => {
          if (a.fitness_status) {
            counts[a.fitness_status] = (counts[a.fitness_status] || 0) + 1;
          }
        });
        return { data: counts };
      });

    return NextResponse.json({
      assets: assets || [],
      total: count || 0,
      limit,
      offset,
      layerCounts,
      fitnessCounts,
    });
  } catch (error) {
    console.error('Assets list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getAmygdalaClient();

    const { data, error } = await supabase
      .from('assets')
      .insert(body)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create asset: ${error.message}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Create asset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
