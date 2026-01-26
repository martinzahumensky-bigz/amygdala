import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = getAmygdalaClient();

    let query = supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch issues: ${error.message}`);
    }

    // Get counts by status
    const { data: allIssues } = await supabase.from('issues').select('status');

    const counts = {
      total: allIssues?.length || 0,
      open: allIssues?.filter((i) => i.status === 'open').length || 0,
      investigating: allIssues?.filter((i) => i.status === 'investigating').length || 0,
      in_progress: allIssues?.filter((i) => i.status === 'in_progress').length || 0,
      resolved: allIssues?.filter((i) => i.status === 'resolved').length || 0,
      closed: allIssues?.filter((i) => i.status === 'closed').length || 0,
    };

    return NextResponse.json({
      issues: data || [],
      counts,
    });
  } catch (error) {
    console.error('Issues fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, assigned_to, resolution } = body;

    if (!id) {
      return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
    }

    const supabase = getAmygdalaClient();

    const updates: Record<string, any> = {};
    if (status) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (resolution !== undefined) updates.resolution = resolution;

    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('issues')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update issue: ${error.message}`);
    }

    return NextResponse.json({ issue: data });
  } catch (error) {
    console.error('Issue update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
