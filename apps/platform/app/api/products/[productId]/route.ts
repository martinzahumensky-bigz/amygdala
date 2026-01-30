import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const supabase = getAmygdalaClient();

    // Get the product
    const { data: product, error } = await supabase
      .from('data_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get linked assets
    const { data: assetLinks } = await supabase
      .from('data_product_assets')
      .select('asset_id, role, added_at')
      .eq('product_id', productId);

    const assetIds = assetLinks?.map(l => l.asset_id) || [];
    let assets: any[] = [];

    if (assetIds.length > 0) {
      const { data: assetData } = await supabase
        .from('assets')
        .select('*')
        .in('id', assetIds);

      // Enrich with role info
      assets = assetData?.map(asset => {
        const link = assetLinks?.find(l => l.asset_id === asset.id);
        return {
          ...asset,
          product_role: link?.role || 'member',
          added_at: link?.added_at,
        };
      }) || [];
    }

    // Calculate aggregate quality score
    const qualityScores = assets
      .map(a => a.quality_score)
      .filter((s): s is number => s !== null);
    const avgQuality = qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : null;

    // Calculate health summary
    const healthSummary = { green: 0, amber: 0, red: 0 };
    assets.forEach(a => {
      if (a.fitness_status && healthSummary.hasOwnProperty(a.fitness_status)) {
        healthSummary[a.fitness_status as keyof typeof healthSummary]++;
      }
    });

    return NextResponse.json({
      product,
      assets,
      assetCount: assets.length,
      qualityScore: avgQuality,
      healthSummary,
    });
  } catch (error) {
    console.error('Product detail error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const body = await request.json();
    const supabase = getAmygdalaClient();

    // Handle status transitions
    const updates: Record<string, any> = { ...body };

    if (body.status === 'published' && !body.published_at) {
      updates.published_at = new Date().toISOString();
    }
    if (body.status === 'deprecated' && !body.deprecated_at) {
      updates.deprecated_at = new Date().toISOString();
    }
    if (body.status === 'retired' && !body.retired_at) {
      updates.retired_at = new Date().toISOString();
    }
    if (body.status === 'draft') {
      updates.published_at = null;
      updates.deprecated_at = null;
      updates.retired_at = null;
    }

    const { data: product, error } = await supabase
      .from('data_products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const supabase = getAmygdalaClient();

    // Soft delete by setting status to retired
    const { error } = await supabase
      .from('data_products')
      .update({ status: 'retired', retired_at: new Date().toISOString() })
      .eq('id', productId);

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
