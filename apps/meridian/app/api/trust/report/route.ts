import { NextResponse } from 'next/server';

// Platform API URL (Amygdala platform)
const PLATFORM_URL = process.env.PLATFORM_URL || 'http://localhost:3002';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, description, confidence, pageUrl, pageTitle, assetName, anomalies, timestamp } =
      body;

    // Validate required fields
    if (!description || !type) {
      return NextResponse.json(
        { success: false, error: 'Description and type are required' },
        { status: 400 }
      );
    }

    // Map confidence to severity
    const severityMap: Record<string, string> = {
      high: 'high',
      medium: 'medium',
      low: 'low',
    };

    // Build issue title
    const issueTitle = `[Visual] ${type.charAt(0).toUpperCase() + type.slice(1)} data reported from ${pageTitle || 'Unknown page'}`;

    // Build detailed description with context
    const issueDescription = `
## User Report
**Type:** ${type}
**Confidence:** ${confidence}
**Page URL:** ${pageUrl}
**Page Title:** ${pageTitle}
**Reported at:** ${timestamp}

## Description
${description}

## Auto-detected Anomalies
${
  anomalies && anomalies.length > 0
    ? anomalies
        .map(
          (a: any) =>
            `- **${a.severity.toUpperCase()}**: ${a.message}${a.value ? ` (Value: ${a.value})` : ''}`
        )
        .join('\n')
    : 'No anomalies auto-detected'
}

## Context
- **Asset:** ${assetName || 'Not identified'}
- **Source:** Data Trust Bubble (Visual Spotter)
`.trim();

    // Try to create issue on the platform
    try {
      const issuePayload = {
        title: issueTitle,
        description: issueDescription,
        severity: severityMap[confidence] || 'medium',
        status: 'open',
        type: 'visual_anomaly',
        source: 'data_trust_bubble',
        affected_assets: assetName ? [assetName] : [],
        metadata: {
          pageUrl,
          pageTitle,
          confidence,
          anomalyCount: anomalies?.length || 0,
          reportedAt: timestamp,
        },
      };

      const response = await fetch(`${PLATFORM_URL}/api/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issuePayload),
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json({
          success: true,
          issueId: result.id || result.issue?.id,
          message: 'Issue reported successfully to Amygdala Platform',
        });
      }
    } catch (platformError) {
      console.error('Failed to create issue on platform:', platformError);
    }

    // If platform is unavailable, store locally (mock success for demo)
    console.log('Issue report (platform unavailable):', {
      title: issueTitle,
      description: issueDescription,
    });

    return NextResponse.json({
      success: true,
      issueId: `local-${Date.now()}`,
      message: 'Issue logged locally (platform unavailable)',
    });
  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
