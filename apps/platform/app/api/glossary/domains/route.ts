import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = getAmygdalaClient();

    const { data: domains, error } = await supabase
      .from('glossary_domains')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch domains: ${error.message}`);
    }

    // Get term counts per domain
    const { data: terms } = await supabase
      .from('glossary_terms')
      .select('domain_id');

    const termCounts: Record<string, number> = {};
    terms?.forEach(t => {
      if (t.domain_id) {
        termCounts[t.domain_id] = (termCounts[t.domain_id] || 0) + 1;
      }
    });

    const enrichedDomains = domains?.map(d => ({
      ...d,
      term_count: termCounts[d.id] || 0,
    })) || [];

    return NextResponse.json({ domains: enrichedDomains });
  } catch (error) {
    console.error('Domains list error:', error);
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

    const { data: domain, error } = await supabase
      .from('glossary_domains')
      .insert({
        name: body.name,
        description: body.description,
        color: body.color,
        icon: body.icon,
        owner: body.owner,
        parent_id: body.parent_id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create domain: ${error.message}`);
    }

    return NextResponse.json(domain);
  } catch (error) {
    console.error('Create domain error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
