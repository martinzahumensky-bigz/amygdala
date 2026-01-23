import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      db: { schema: 'meridian' }
    });

    // Get loan data from bronze_loans table
    const { data: loansData, error: loansError } = await supabase
      .from('bronze_loans')
      .select('*');

    if (loansError) {
      console.error('Loans fetch error:', loansError);
      return NextResponse.json({ error: loansError.message }, { status: 500 });
    }

    // Calculate portfolio metrics
    const loans = loansData || [];
    const totalLoans = loans.length;
    const totalPrincipal = loans.reduce((sum, loan) => sum + (loan.principal_amount || 0), 0);
    const totalOutstanding = loans.reduce((sum, loan) => sum + (loan.outstanding_balance || 0), 0);

    // Group by status
    const statusCounts: Record<string, { count: number; amount: number }> = {};
    loans.forEach(loan => {
      const status = loan.status || 'Unknown';
      if (!statusCounts[status]) {
        statusCounts[status] = { count: 0, amount: 0 };
      }
      statusCounts[status].count++;
      statusCounts[status].amount += loan.outstanding_balance || 0;
    });

    // Group by loan type
    const typeCounts: Record<string, { count: number; amount: number }> = {};
    loans.forEach(loan => {
      const type = loan.loan_type || 'Unknown';
      if (!typeCounts[type]) {
        typeCounts[type] = { count: 0, amount: 0 };
      }
      typeCounts[type].count++;
      typeCounts[type].amount += loan.principal_amount || 0;
    });

    // Calculate delinquency
    const delinquentLoans = loans.filter(loan =>
      loan.days_past_due && loan.days_past_due > 0
    );
    const delinquencyRate = totalLoans > 0
      ? (delinquentLoans.length / totalLoans) * 100
      : 0;

    return NextResponse.json({
      summary: {
        totalLoans,
        totalPrincipal,
        totalOutstanding,
        delinquencyRate: delinquencyRate.toFixed(2),
        delinquentCount: delinquentLoans.length
      },
      byStatus: Object.entries(statusCounts).map(([status, data]) => ({
        status,
        ...data
      })),
      byType: Object.entries(typeCounts).map(([type, data]) => ({
        type,
        ...data
      })),
      recentLoans: loans.slice(0, 20)
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
