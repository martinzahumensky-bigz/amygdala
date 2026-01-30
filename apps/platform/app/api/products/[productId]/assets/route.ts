import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const body = await request.json();
    const { asset_ids, role = 'member' } = body;

    if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
      return NextResponse.json(
        { error: 'asset_ids array is required' },
        { status: 400 }
      );
    }

    const supabase = getAmygdalaClient();

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('data_products')
      .select('id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Create links (upsert to handle duplicates)
    const links = asset_ids.map((assetId: string) => ({
      product_id: productId,
      asset_id: assetId,
      role,
    }));

    const { data, error } = await supabase
      .from('data_product_assets')
      .upsert(links, { onConflict: 'product_id,asset_id' })
      .select();

    if (error) {
      throw new Error(`Failed to add assets: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      added: data?.length || 0,
    });
  } catch (error) {
    console.error('Add assets error:', error);
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
    const body = await request.json();
    const { asset_ids } = body;

    if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
      return NextResponse.json(
        { error: 'asset_ids array is required' },
        { status: 400 }
      );
    }

    const supabase = getAmygdalaClient();

    const { error } = await supabase
      .from('data_product_assets')
      .delete()
      .eq('product_id', productId)
      .in('asset_id', asset_ids);

    if (error) {
      throw new Error(`Failed to remove assets: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      removed: asset_ids.length,
    });
  } catch (error) {
    console.error('Remove assets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
