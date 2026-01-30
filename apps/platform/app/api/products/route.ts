import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const domain = searchParams.get('domain');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getAmygdalaClient();

    // Build the query
    let query = supabase
      .from('data_products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (domain && domain !== 'all') {
      query = query.eq('domain', domain);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: products, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    // Get asset counts for each product
    const productIds = products?.map(p => p.id) || [];
    let assetCounts: Record<string, number> = {};

    if (productIds.length > 0) {
      const { data: counts } = await supabase
        .from('data_product_assets')
        .select('product_id')
        .in('product_id', productIds);

      counts?.forEach(c => {
        assetCounts[c.product_id] = (assetCounts[c.product_id] || 0) + 1;
      });
    }

    // Enrich products with asset counts
    const enrichedProducts = products?.map(p => ({
      ...p,
      asset_count: assetCounts[p.id] || 0,
    })) || [];

    // Get counts by domain
    const { data: allProducts } = await supabase.from('data_products').select('domain, status');
    const domainCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = { draft: 0, published: 0, deprecated: 0, retired: 0 };

    allProducts?.forEach(p => {
      if (p.domain) {
        domainCounts[p.domain] = (domainCounts[p.domain] || 0) + 1;
      }
      if (p.status) {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      }
    });

    return NextResponse.json({
      products: enrichedProducts,
      total: count || 0,
      limit,
      offset,
      domainCounts,
      statusCounts,
    });
  } catch (error) {
    console.error('Products list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { asset_ids, ...productData } = body;

    const supabase = getAmygdalaClient();

    // Create the product
    const { data: product, error } = await supabase
      .from('data_products')
      .insert(productData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    // If asset_ids provided, link them
    if (asset_ids && asset_ids.length > 0) {
      const assetLinks = asset_ids.map((assetId: string) => ({
        product_id: product.id,
        asset_id: assetId,
        role: 'member',
      }));

      const { error: linkError } = await supabase
        .from('data_product_assets')
        .insert(assetLinks);

      if (linkError) {
        console.error('Failed to link assets:', linkError);
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
