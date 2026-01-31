import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const domain = searchParams.get('domain');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getAmygdalaClient();

    // Build the query
    let query = supabase
      .from('glossary_terms')
      .select(`
        *,
        domain:glossary_domains(id, name, color, icon)
      `, { count: 'exact' })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,definition.ilike.%${search}%,abbreviation.ilike.%${search}%`);
    }

    if (domain && domain !== 'all') {
      query = query.eq('domain_id', domain);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: terms, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch terms: ${error.message}`);
    }

    // Get linked asset counts for each term
    const termIds = terms?.map(t => t.id) || [];
    let linkedCounts: Record<string, number> = {};

    if (termIds.length > 0) {
      const { data: links } = await supabase
        .from('glossary_term_links')
        .select('term_id')
        .in('term_id', termIds);

      links?.forEach(l => {
        linkedCounts[l.term_id] = (linkedCounts[l.term_id] || 0) + 1;
      });
    }

    // Enrich terms with link counts
    const enrichedTerms = terms?.map(t => ({
      ...t,
      linked_count: linkedCounts[t.id] || 0,
    })) || [];

    // Get counts by domain and status
    const { data: allTerms } = await supabase.from('glossary_terms').select('domain_id, status');
    const domainCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = { draft: 0, approved: 0, deprecated: 0 };

    allTerms?.forEach(t => {
      if (t.domain_id) {
        domainCounts[t.domain_id] = (domainCounts[t.domain_id] || 0) + 1;
      }
      if (t.status) {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      }
    });

    return NextResponse.json({
      terms: enrichedTerms,
      total: count || 0,
      limit,
      offset,
      domainCounts,
      statusCounts,
    });
  } catch (error) {
    console.error('Glossary list error:', error);
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

    // Create the term
    const { data: term, error } = await supabase
      .from('glossary_terms')
      .insert({
        name: body.name,
        definition: body.definition,
        domain_id: body.domain_id || null,
        status: body.status || 'draft',
        owner: body.owner,
        steward: body.steward,
        synonyms: body.synonyms || [],
        abbreviation: body.abbreviation,
        examples: body.examples,
        source: body.source,
        related_terms: body.related_terms || [],
      })
      .select(`
        *,
        domain:glossary_domains(id, name, color, icon)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create term: ${error.message}`);
    }

    return NextResponse.json(term);
  } catch (error) {
    console.error('Create term error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
