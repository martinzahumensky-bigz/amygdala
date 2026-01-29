import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

/**
 * PATCH /api/assets/[assetId]/columns
 * Update column metadata (description, business_terms, classifications)
 *
 * Body: { columnName: string, description?: string, business_terms?: string[], classifications?: string[] }
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { assetId } = await params;
    const body = await request.json();
    const { columnName, description, business_terms, classifications, highlights } = body;

    if (!columnName) {
      return NextResponse.json(
        { error: 'columnName is required' },
        { status: 400 }
      );
    }

    const supabase = getAmygdalaClient();

    // Build updates object
    const updates: Record<string, unknown> = {
      profiled_at: new Date().toISOString(),
    };

    if (description !== undefined) updates.description = description;
    if (business_terms !== undefined) updates.business_terms = business_terms;
    if (classifications !== undefined) updates.classifications = classifications;
    if (highlights !== undefined) updates.highlights = highlights;

    // Update the column profile
    const { data, error } = await supabase
      .from('column_profiles')
      .update(updates)
      .eq('asset_id', assetId)
      .eq('column_name', columnName)
      .select()
      .single();

    if (error) {
      // If no row exists, try to create it
      if (error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from('column_profiles')
          .insert({
            asset_id: assetId,
            column_name: columnName,
            ...updates,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create column profile: ${insertError.message}`);
        }

        return NextResponse.json({ column: newData });
      }

      throw new Error(`Failed to update column: ${error.message}`);
    }

    return NextResponse.json({ column: data });
  } catch (error) {
    console.error('Column update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assets/[assetId]/columns
 * Get all column profiles for an asset with quality rules
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { assetId } = await params;
    const supabase = getAmygdalaClient();

    // Get asset to retrieve name for quality rules lookup
    const { data: asset } = await supabase
      .from('assets')
      .select('name')
      .eq('id', assetId)
      .single();

    // Get column profiles
    const { data: columns, error } = await supabase
      .from('column_profiles')
      .select('*')
      .eq('asset_id', assetId)
      .order('column_name');

    if (error) {
      throw new Error(`Failed to fetch columns: ${error.message}`);
    }

    // Get quality rules for this asset (by target_asset name)
    const { data: qualityRules } = await supabase
      .from('quality_rules')
      .select('*')
      .eq('target_asset', asset?.name || '')
      .eq('enabled', true);

    // Group rules by target_column
    const rulesByColumn: Record<string, any[]> = {};
    for (const rule of qualityRules || []) {
      const colName = rule.target_column || '_asset_level';
      if (!rulesByColumn[colName]) {
        rulesByColumn[colName] = [];
      }
      rulesByColumn[colName].push({
        id: rule.id,
        name: rule.name,
        rule_type: rule.rule_type,
        expression: rule.expression,
        severity: rule.severity,
        threshold: rule.threshold,
        pass_rate: rule.last_pass_rate,
        last_executed: rule.last_validated_at,
        is_active: rule.enabled,
      });
    }

    // Enrich columns with rules and transform for UI
    const enrichedColumns = (columns || []).map((col: any) => ({
      name: col.column_name,
      data_type: col.data_type,
      inferred_semantic_type: col.inferred_semantic_type,
      null_count: col.null_count || 0,
      null_percentage: col.null_percentage || 0,
      distinct_count: col.distinct_count || 0,
      distinct_percentage: col.distinct_percentage || 0,
      min_value: col.min_value,
      max_value: col.max_value,
      mean_value: col.mean_value,
      top_values: col.top_values || [],
      // New fields for Data Structure tab
      description: col.description,
      business_terms: col.business_terms || [],
      classifications: col.classifications || [],
      highlights: col.highlights || [],
      // Quality rules for this column
      quality_rules: rulesByColumn[col.column_name] || [],
      // Computed flags
      is_sensitive: (col.classifications || []).some((c: string) =>
        ['PII', 'PHI', 'PCI', 'Sensitive'].includes(c)
      ) || ['email', 'phone', 'address', 'ssn', 'credit_card', 'password'].includes(
        col.inferred_semantic_type?.toLowerCase() || ''
      ),
    }));

    return NextResponse.json({
      columns: enrichedColumns,
      rulesByColumn,
    });
  } catch (error) {
    console.error('Columns fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
