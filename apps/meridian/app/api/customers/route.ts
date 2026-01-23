import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const segment = searchParams.get('segment') || '';
    const validPhoneOnly = searchParams.get('validPhone') === 'true';
    const validEmailOnly = searchParams.get('validEmail') === 'true';

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    let query = supabase
      .from('silver_customers')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,customer_id.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (segment) {
      query = query.eq('segment_id', segment);
    }

    if (validPhoneOnly) {
      query = query.eq('phone_valid', true);
    }

    if (validEmailOnly) {
      query = query.eq('email_valid', true);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1).order('customer_id', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Customer fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get segment counts
    const { data: segmentData } = await supabase
      .from('ref_customer_segments')
      .select('*');

    // Get quality stats
    const { data: statsData } = await supabase
      .from('silver_customers')
      .select('phone_valid, email_valid, segment_id');

    const stats = {
      total: statsData?.length || 0,
      validPhones: statsData?.filter(c => c.phone_valid).length || 0,
      validEmails: statsData?.filter(c => c.email_valid).length || 0,
      missingSegments: statsData?.filter(c => !c.segment_id).length || 0
    };

    return NextResponse.json({
      customers: data || [],
      total: count || 0,
      segments: segmentData || [],
      stats
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
