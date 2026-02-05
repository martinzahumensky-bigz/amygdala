import { NextResponse } from 'next/server';

// Platform API URL (Amygdala platform)
const PLATFORM_URL = process.env.PLATFORM_URL || 'http://localhost:3002';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetName = searchParams.get('asset');

    if (!assetName) {
      return NextResponse.json({ error: 'Asset name is required' }, { status: 400 });
    }

    // First, get the asset ID from the platform
    const assetsResponse = await fetch(`${PLATFORM_URL}/api/assets?search=${encodeURIComponent(assetName)}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!assetsResponse.ok) {
      // If platform is not available, return mock data for demo
      return NextResponse.json({
        success: true,
        data: getMockTrustData(assetName),
      });
    }

    const assetsData = await assetsResponse.json();
    const asset = assetsData.assets?.find((a: any) =>
      a.name.toLowerCase() === assetName.toLowerCase()
    );

    if (!asset) {
      // Return mock data if asset not found
      return NextResponse.json({
        success: true,
        data: getMockTrustData(assetName),
      });
    }

    // Get trust index for the specific asset
    const trustResponse = await fetch(
      `${PLATFORM_URL}/api/trust-index?assetId=${asset.id}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!trustResponse.ok) {
      return NextResponse.json({
        success: true,
        data: getMockTrustData(assetName),
      });
    }

    const trustData = await trustResponse.json();
    const assetScore = trustData.assetScores;

    // Transform to our TrustData format
    const result = {
      success: true,
      data: {
        score: Math.round((assetScore?.rawScore || 0.72) * 100),
        stars: assetScore?.stars || 4,
        status: assetScore?.fitnessStatus || 'amber',
        trustLevel: assetScore?.trustInsight?.trustLevel || 'good',
        lastRefresh: assetScore?.trustInsight?.liveTrust?.lastRefresh,
        issueCount: assetScore?.trustInsight?.liveTrust?.issueCount || 0,
        factors: assetScore?.factors,
        aiSummary: assetScore?.trustInsight?.aiSummary || 'Data trust information available.',
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Trust API error:', error);

    // Return mock data on error for demo purposes
    const { searchParams } = new URL(request.url);
    const assetName = searchParams.get('asset') || 'unknown';

    return NextResponse.json({
      success: true,
      data: getMockTrustData(assetName),
    });
  }
}

// Mock data for demo when platform is unavailable
function getMockTrustData(assetName: string) {
  const assetConfigs: Record<string, any> = {
    gold_daily_revenue: {
      score: 72,
      stars: 4,
      status: 'amber',
      trustLevel: 'good',
      issueCount: 1,
      aiSummary: 'Well-maintained dataset with good trust indicators. Data is properly governed. Note: 1 active issue.',
      factors: {
        documentation: 0.85,
        governance: 0.78,
        quality: 0.65,
        usage: 0.80,
        reliability: 0.72,
        freshness: 0.68,
      },
    },
    gold_branch_metrics: {
      score: 68,
      stars: 3,
      status: 'amber',
      trustLevel: 'moderate',
      issueCount: 2,
      aiSummary: 'Dataset has reasonable trust, but could be improved. Note: data may be stale, 2 active issues.',
      factors: {
        documentation: 0.72,
        governance: 0.65,
        quality: 0.58,
        usage: 0.75,
        reliability: 0.68,
        freshness: 0.52,
      },
    },
    silver_customers: {
      score: 78,
      stars: 4,
      status: 'green',
      trustLevel: 'good',
      issueCount: 0,
      aiSummary: 'Highly trustworthy dataset with excellent governance. Data is well-documented and properly governed.',
      factors: {
        documentation: 0.88,
        governance: 0.82,
        quality: 0.75,
        usage: 0.72,
        reliability: 0.78,
        freshness: 0.80,
      },
    },
  };

  return (
    assetConfigs[assetName.toLowerCase()] || {
      score: 70,
      stars: 4,
      status: 'amber',
      trustLevel: 'moderate',
      issueCount: 0,
      aiSummary: 'Data trust information available for this asset.',
      factors: {
        documentation: 0.70,
        governance: 0.70,
        quality: 0.70,
        usage: 0.70,
        reliability: 0.70,
        freshness: 0.70,
      },
    }
  );
}
