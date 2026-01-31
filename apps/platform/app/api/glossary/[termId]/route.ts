import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ termId: string }> }
) {
  try {
    const { termId } = await params;
    const supabase = getAmygdalaClient();

    // Get the term with its domain
    const { data: term, error } = await supabase
      .from('glossary_terms')
      .select(`
        *,
        domain:glossary_domains(id, name, color, icon)
      `)
      .eq('id', termId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Term not found' }, { status: 404 });
      }
      throw new Error(`Failed to fetch term: ${error.message}`);
    }

    // Get linked assets/columns
    const { data: links } = await supabase
      .from('glossary_term_links')
      .select(`
        *,
        asset:assets(id, name, description, layer, type)
      `)
      .eq('term_id', termId);

    // Get related terms (if any)
    let relatedTerms: any[] = [];
    if (term.related_terms && term.related_terms.length > 0) {
      const { data: related } = await supabase
        .from('glossary_terms')
        .select('id, name, abbreviation, status')
        .in('id', term.related_terms);
      relatedTerms = related || [];
    }

    return NextResponse.json({
      ...term,
      links: links || [],
      relatedTermsData: relatedTerms,
      linked_count: links?.length || 0,
    });
  } catch (error) {
    console.error('Get term error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ termId: string }> }
) {
  try {
    const { termId } = await params;
    const body = await request.json();

    const supabase = getAmygdalaClient();

    // Build update object
    const updateData: Record<string, any> = {};
    const allowedFields = [
      'name', 'definition', 'domain_id', 'status', 'owner', 'steward',
      'synonyms', 'abbreviation', 'examples', 'source', 'related_terms'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle status changes
    if (body.status === 'approved' && !body.approved_at) {
      updateData.approved_at = new Date().toISOString();
    } else if (body.status === 'deprecated' && !body.deprecated_at) {
      updateData.deprecated_at = new Date().toISOString();
    }

    const { data: term, error } = await supabase
      .from('glossary_terms')
      .update(updateData)
      .eq('id', termId)
      .select(`
        *,
        domain:glossary_domains(id, name, color, icon)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update term: ${error.message}`);
    }

    return NextResponse.json(term);
  } catch (error) {
    console.error('Update term error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ termId: string }> }
) {
  try {
    const { termId } = await params;
    const supabase = getAmygdalaClient();

    const { error } = await supabase
      .from('glossary_terms')
      .delete()
      .eq('id', termId);

    if (error) {
      throw new Error(`Failed to delete term: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete term error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
