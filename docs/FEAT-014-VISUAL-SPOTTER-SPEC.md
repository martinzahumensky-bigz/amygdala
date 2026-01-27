# FEAT-014: Visual Spotter & Data Trust Bubble
## Browser-Embedded Trust Agent Extension

> **Status:** Draft
> **Version:** 1.0
> **Last Updated:** 2026-01-27

---

## Executive Summary

The Visual Spotter is a revolutionary approach to data trust monitoring that **looks at data the way humans do**—through the actual UI. Instead of only querying databases, Visual Spotter operates as a Chrome extension embedded directly in business applications, providing real-time trust assessment visible to end users.

**The key innovation:** A floating "Data Trust Bubble" (like the 100sharp.com chat widget) that:
1. Watches the page like an "eye" monitoring for anomalies
2. Shows dynamic trust scores for visible data
3. Allows users to report issues directly
4. Validates data by clicking through UI like a real person

---

## The Problem with Database-Only Spotting

### Current Spotter Approach

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Spotter       │─────▶│   Database      │─────▶│   Issues        │
│   Agent         │      │   Queries       │      │   Created       │
└─────────────────┘      └─────────────────┘      └─────────────────┘

Problem: Spotter never sees what the USER sees
```

### What Spotter Misses

| Database Query Shows | What User Actually Sees |
|---------------------|------------------------|
| Row count: 1,000 | Chart showing only 800 (filter bug) |
| Revenue: $2.3M | Report showing $0 (rendering error) |
| All branches present | "Unknown" label in dropdown |
| Data is fresh | Cached report from 3 days ago |
| No null values | UI shows "N/A" everywhere |

### The Gap

**Database truth ≠ Presentation truth**

Users distrust data based on what they **see**, not what's in the database.

---

## Solution: Visual Spotter Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VISUAL SPOTTER SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    CHROME EXTENSION                                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │ │
│  │  │ Content      │  │ Data Trust   │  │ Visual       │                  │ │
│  │  │ Script       │  │ Bubble UI    │  │ Scanner      │                  │ │
│  │  │ (DOM Reader) │  │ (Widget)     │  │ (Anomaly AI) │                  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │ │
│  │         │                 │                 │                           │ │
│  │         └─────────────────┼─────────────────┘                           │ │
│  │                           │                                             │ │
│  │  ┌────────────────────────▼────────────────────────────────────────┐   │ │
│  │  │                    EXTENSION CORE                                │   │ │
│  │  │  • Page Analysis Engine                                          │   │ │
│  │  │  • Trust Score Calculator                                        │   │ │
│  │  │  • Issue Reporter                                                │   │ │
│  │  │  • MCP Client (to Amygdala)                                     │   │ │
│  │  └────────────────────────┬────────────────────────────────────────┘   │ │
│  └───────────────────────────┼────────────────────────────────────────────┘ │
│                              │                                               │
│                              │ WebSocket / API                               │
│                              │                                               │
│  ┌───────────────────────────▼────────────────────────────────────────────┐ │
│  │                      AMYGDALA PLATFORM                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │ │
│  │  │ Visual       │  │ Trust        │  │ Issue        │                  │ │
│  │  │ Spotter API  │  │ Index API    │  │ Tracker      │                  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component 1: Data Trust Bubble

### UI Design

The Data Trust Bubble is a floating widget embedded in the corner of any monitored application.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  MERIDIAN BANK - Daily Revenue Report                         2026-01-27   │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ $2,450,000   │ │   +5.2%      │ │   1,247      │ │   $1,964     │       │
│  │ Total Revenue│ │ vs Yesterday │ │ Transactions │ │ Avg Value    │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                              │
│  Revenue by Branch                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Downtown Main   ████████████████████████  $450,000                     ││
│  │ Westside Center ████████████████████      $380,000                     ││
│  │ Airport Branch  ███████████████           $320,000                     ││
│  │ [UNKNOWN]       ██                        $45,000   ⚠️                 ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│                                                       ┌─────────────────────┐│
│                                                       │  👁️ DATA TRUST     ││
│                                                       │  ══════════════════ ││
│                                                       │                     ││
│                                                       │  Trust: ⭐⭐⭐☆☆   ││
│                                                       │  Score: 67%        ││
│                                                       │  Status: 🟡 AMBER  ││
│                                                       │                     ││
│                                                       │  ⚠️ 2 issues found ││
│                                                       │  📊 Click to view  ││
│                                                       │                     ││
│                                                       │  [Report Issue]    ││
│                                                       └─────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bubble States

**Collapsed State (Eye Icon):**
```
      ┌─────┐
      │ 👁️  │ ← Pulsing animation when scanning
      │ 🟡  │ ← Color indicates trust status
      └─────┘
```

**Expanded State:**
```
┌─────────────────────────┐
│ 👁️ DATA TRUST          │
│ ═══════════════════════ │
│                         │
│ Trust Score: 67%        │
│ ⭐⭐⭐☆☆ (3.4/5)        │
│ Status: 🟡 AMBER        │
│                         │
│ ──────────────────────  │
│ 📊 Current Page Scan    │
│                         │
│ ✅ Data freshness OK    │
│ ⚠️ Unknown branch found │
│ ⚠️ Missing East region  │
│                         │
│ ──────────────────────  │
│ 🔍 Recent Scans         │
│ • Branch Report ✅      │
│ • Customer 360 ⚠️       │
│ • Pipeline Status ✅    │
│                         │
│ ──────────────────────  │
│ [📝 Report Issue]       │
│ [🔄 Rescan Page]        │
│ [⚙️ Settings]           │
└─────────────────────────┘
```

### Bubble Behaviors

| User Action | Bubble Response |
|-------------|-----------------|
| Hover over eye | Show mini tooltip with trust score |
| Click eye | Expand to full panel |
| Page loads | Auto-scan and update trust score |
| Anomaly detected | Pulse animation + notification |
| User scrolls to new section | Rescan visible area |
| Report Issue clicked | Open issue form with page context |

---

## Component 2: Visual Scanner

### How It Works

The Visual Scanner reads the DOM and uses AI to identify data elements and assess their trustworthiness.

```typescript
interface VisualScanResult {
  pageType: 'report' | 'dashboard' | 'form' | 'table' | 'unknown';
  dataElements: DataElement[];
  anomalies: VisualAnomaly[];
  trustScore: number;
  fitnessStatus: 'green' | 'amber' | 'red';
  scanDuration: number;
}

interface DataElement {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'text' | 'date';
  label: string;
  value: string | number;
  position: { x: number; y: number; width: number; height: number };
  confidence: number;  // How confident we are this is a data element
  dataSource?: string; // If identifiable (e.g., from data attributes)
}

interface VisualAnomaly {
  elementId: string;
  anomalyType: VisualAnomalyType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: {
    expected?: string;
    actual: string;
    screenshot?: string;
  };
}

type VisualAnomalyType =
  | 'missing_data'      // Expected element not rendered
  | 'zero_value'        // Suspicious zero where data expected
  | 'unknown_category'  // Unknown label (like "[UNKNOWN]")
  | 'stale_date'        // Date indicator showing old data
  | 'rendering_error'   // UI showing error state
  | 'empty_chart'       // Chart with no data
  | 'truncated_data'    // Data appears cut off
  | 'outlier_visual'    // Bar/line that's way off from others
  | 'format_issue';     // Data displayed incorrectly
```

### Scanning Process

```
1. PAGE LOAD
   ↓
2. IDENTIFY PAGE TYPE
   - Look for common report frameworks (Tableau, PowerBI, etc.)
   - Detect table structures, charts, KPI cards
   ↓
3. EXTRACT DATA ELEMENTS
   - Find numbers with labels
   - Identify charts and their data
   - Extract table cells
   - Parse date indicators
   ↓
4. RUN ANOMALY CHECKS
   - Zero/null values in KPIs
   - "[Unknown]" or "N/A" labels
   - Missing expected categories
   - Stale date indicators
   - Empty visualizations
   ↓
5. CALCULATE VISUAL TRUST SCORE
   - Weight anomalies by severity
   - Consider page coverage
   - Factor in data source trust (if known)
   ↓
6. UPDATE BUBBLE UI
   - Show trust score
   - List anomalies
   - Enable reporting
```

### AI-Powered Visual Analysis

The extension uses Claude to analyze screenshots for complex anomalies:

```typescript
async function analyzePageWithClaude(
  screenshot: string,
  pageContext: PageContext
): Promise<VisualAnalysisResult> {
  const response = await fetch('https://amygdala.vercel.app/api/visual-spotter/analyze', {
    method: 'POST',
    body: JSON.stringify({
      screenshot: screenshot,  // Base64 encoded
      pageUrl: pageContext.url,
      pageTitle: pageContext.title,
      extractedData: pageContext.dataElements,
    }),
  });

  return response.json();
}
```

**Claude Analysis Prompt:**
```
You are the Visual Spotter agent analyzing a business report or dashboard screenshot.

Your task is to identify visual anomalies that would make a business user distrust the data:

1. MISSING DATA
   - Look for empty charts, blank areas where data should be
   - Check if all expected categories are present in visualizations

2. SUSPICIOUS VALUES
   - Zero values that seem unlikely (zero revenue, zero customers)
   - Numbers that are orders of magnitude different from peers

3. UNKNOWN/ERROR LABELS
   - "[Unknown]", "N/A", "Error", "No Data" labels
   - Placeholder text that shouldn't be in production

4. STALENESS INDICATORS
   - Check date labels - is this data current?
   - "Last updated" timestamps that are too old

5. VISUAL INCONSISTENCIES
   - Totals that don't match sum of parts
   - Charts with missing data points
   - Tables with suspiciously empty rows

Return a JSON array of anomalies found with severity and description.
```

---

## Component 3: Click-Through Validation

### Human-Like UI Interaction

Visual Spotter can navigate through the UI like a real person to validate data:

```typescript
interface ValidationScenario {
  name: string;
  description: string;
  steps: ValidationStep[];
  expectedOutcome: string;
  timeout: number;
}

interface ValidationStep {
  action: 'click' | 'type' | 'scroll' | 'wait' | 'screenshot' | 'extract';
  target?: string;  // CSS selector or description
  value?: string;   // For 'type' action
  duration?: number; // For 'wait' action
  extractConfig?: {
    selector: string;
    property: 'text' | 'value' | 'attribute';
    attributeName?: string;
  };
}
```

### Example: Validate Revenue Drill-Down

```typescript
const revenueValidation: ValidationScenario = {
  name: 'Revenue Drill-Down Validation',
  description: 'Click through revenue report to validate totals match details',
  steps: [
    // Step 1: Find and extract the total revenue
    {
      action: 'extract',
      extractConfig: {
        selector: '[data-metric="total-revenue"]',
        property: 'text',
      },
    },
    // Step 2: Click to drill down
    {
      action: 'click',
      target: '[data-metric="total-revenue"]',
    },
    // Step 3: Wait for detail view
    {
      action: 'wait',
      duration: 2000,
    },
    // Step 4: Extract all detail values
    {
      action: 'extract',
      extractConfig: {
        selector: '.detail-row .amount',
        property: 'text',
      },
    },
    // Step 5: Screenshot for evidence
    {
      action: 'screenshot',
    },
  ],
  expectedOutcome: 'Sum of detail amounts equals total revenue',
  timeout: 30000,
};
```

### Browser Automation Options

The extension can use multiple approaches for click-through validation:

| Approach | Pros | Cons |
|----------|------|------|
| **Content Script + DOM** | Native, fast, no setup | Limited to visible page |
| **Chrome DevTools Protocol** | Full control, background execution | More complex |
| **Playwright MCP** | Cross-browser, powerful | Requires separate setup |
| **Claude Computer Use** | AI-driven navigation | Latency, cost |

**Recommended Hybrid Approach:**
1. Use Content Script for quick DOM-based validation
2. Use Chrome DevTools Protocol for complex multi-page flows
3. Reserve Claude Computer Use for novel/unexpected scenarios

---

## Component 4: Issue Reporting Widget

### User-Initiated Reports

```
┌─────────────────────────────────────────────┐
│ 📝 Report Data Issue                        │
├─────────────────────────────────────────────┤
│                                              │
│ What's wrong?                               │
│ ┌─────────────────────────────────────────┐ │
│ │ ○ Data looks incorrect                  │ │
│ │ ○ Data is missing                       │ │
│ │ ○ Data is stale/outdated               │ │
│ │ ○ Something else is wrong              │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ Describe the issue:                         │
│ ┌─────────────────────────────────────────┐ │
│ │ The East region revenue should be       │ │
│ │ around $800K based on last month...     │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ☑️ Attach screenshot of current page        │
│ ☑️ Include page URL and context             │
│                                              │
│ Your confidence:                            │
│ ○ I'm certain this is wrong               │
│ ● I think something might be wrong         │
│ ○ I'm not sure but wanted to flag         │
│                                              │
│ ┌───────────────┐  ┌───────────────────┐   │
│ │    Cancel     │  │  Submit Report    │   │
│ └───────────────┘  └───────────────────┘   │
│                                              │
└─────────────────────────────────────────────┘
```

### Auto-Populated Context

When user reports an issue, the extension automatically captures:

```typescript
interface UserReportContext {
  // Page context
  pageUrl: string;
  pageTitle: string;
  pageType: string;
  visitedAt: string;

  // Current visual state
  screenshot: string;  // Base64
  visibleDataElements: DataElement[];
  currentTrustScore: number;

  // User's selection (if any)
  selectedElement?: {
    selector: string;
    innerText: string;
    boundingBox: DOMRect;
  };

  // Automatic anomalies already detected
  existingAnomalies: VisualAnomaly[];

  // Session context
  previousPages: string[];  // Breadcrumb trail
  timeOnPage: number;
}
```

---

## Component 5: Real-Time Trust Display

### Dynamic Trust Score Updates

The trust bubble updates in real-time as the user interacts with the page:

```typescript
class TrustScoreManager {
  private currentScore: number = 100;
  private factors: TrustFactor[] = [];
  private observers: MutationObserver[] = [];

  // Called when page loads
  async initialize(pageContext: PageContext) {
    // Get base trust from Amygdala for known data sources
    const baseTrust = await this.fetchAssetTrust(pageContext.dataSources);

    // Scan page for visual anomalies
    const visualScore = await this.scanPage();

    // Combine scores
    this.currentScore = this.calculateCombinedScore(baseTrust, visualScore);

    // Set up mutation observers for dynamic content
    this.observePageChanges();

    // Update UI
    this.updateBubble();
  }

  // Called when DOM changes
  onPageMutation(mutations: MutationRecord[]) {
    // Check if data elements changed
    const dataChanges = this.detectDataChanges(mutations);

    if (dataChanges.length > 0) {
      // Re-scan affected areas
      this.rescanElements(dataChanges);
    }
  }

  // Calculate combined trust score
  calculateCombinedScore(baseTrust: number, visualScore: number): number {
    // If visual shows problems, it overrides good database trust
    if (visualScore < 50) {
      return Math.min(baseTrust, visualScore);
    }

    // Otherwise, blend the scores
    return (baseTrust * 0.6) + (visualScore * 0.4);
  }
}
```

### Trust Factor Breakdown

```
┌─────────────────────────────────────────────┐
│ 📊 Trust Score Breakdown                    │
├─────────────────────────────────────────────┤
│                                              │
│ Overall: 67% ████████████████░░░░░░░░      │
│                                              │
│ Factors:                                    │
│                                              │
│ 📁 Source Trust      85%  ████████████░░   │
│    gold_daily_revenue asset                 │
│                                              │
│ 🔍 Visual Integrity  60%  ████████░░░░░░   │
│    1 unknown category found                 │
│                                              │
│ ⏰ Data Freshness    80%  ██████████░░░    │
│    Updated 4 hours ago                      │
│                                              │
│ ⚠️ Active Issues     40%  █████░░░░░░░░░   │
│    2 open issues affect this data           │
│                                              │
│ 📈 Historical Trend  75%  █████████░░░░    │
│    Slight degradation from last week        │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Chrome Extension Foundation (Week 1)

- [ ] Create Chrome extension manifest V3 structure
- [ ] Implement content script for DOM reading
- [ ] Build basic Data Trust Bubble UI component
- [ ] Set up message passing between content script and background

### Phase 2: Visual Scanner (Week 2)

- [ ] Implement data element detection (tables, charts, KPIs)
- [ ] Build anomaly detection rules engine
- [ ] Create screenshot capture functionality
- [ ] Integrate with Amygdala API for trust scores

### Phase 3: AI Visual Analysis (Week 3)

- [ ] Build API endpoint for Claude visual analysis
- [ ] Implement screenshot → anomaly detection pipeline
- [ ] Add semantic page understanding
- [ ] Create anomaly explanation generation

### Phase 4: Click-Through Validation (Week 4)

- [ ] Implement basic click/type/scroll automation
- [ ] Build validation scenario framework
- [ ] Create pre-built validation templates
- [ ] Add custom scenario builder

### Phase 5: Issue Reporting & Integration (Week 5)

- [ ] Build issue reporting widget
- [ ] Integrate with Amygdala issue tracker
- [ ] Add auto-context capture
- [ ] Create feedback loop to Spotter agent

### Phase 6: Real-Time Updates & Polish (Week 6)

- [ ] Implement MutationObserver for dynamic pages
- [ ] Add WebSocket for real-time trust updates
- [ ] Polish UI animations and transitions
- [ ] Create configuration options

---

## Technical Architecture

### Extension Structure

```
amygdala-trust-extension/
├── manifest.json
├── src/
│   ├── background/
│   │   ├── service-worker.ts      # Extension background script
│   │   ├── api-client.ts          # Amygdala API client
│   │   └── trust-cache.ts         # Cache trust scores
│   ├── content/
│   │   ├── content-script.ts      # Main content script
│   │   ├── dom-scanner.ts         # DOM analysis
│   │   ├── data-extractor.ts      # Extract data elements
│   │   └── anomaly-detector.ts    # Visual anomaly detection
│   ├── ui/
│   │   ├── bubble/
│   │   │   ├── TrustBubble.tsx    # Main bubble component
│   │   │   ├── TrustScore.tsx     # Score display
│   │   │   ├── AnomalyList.tsx    # Anomaly list
│   │   │   └── IssueForm.tsx      # Issue reporting
│   │   └── styles/
│   │       └── bubble.css
│   ├── automation/
│   │   ├── click-validator.ts     # UI click-through
│   │   └── scenarios/
│   │       └── revenue-drill.ts
│   └── shared/
│       ├── types.ts
│       └── config.ts
├── popup/
│   └── popup.html                  # Extension popup
├── options/
│   └── options.html                # Settings page
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Amygdala Data Trust",
  "version": "1.0.0",
  "description": "Real-time data trust monitoring for business applications",

  "permissions": [
    "activeTab",
    "storage",
    "tabs"
  ],

  "host_permissions": [
    "https://*.vercel.app/*",
    "https://amygdala.vercel.app/*"
  ],

  "background": {
    "service_worker": "background/service-worker.js"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js"],
      "css": ["ui/styles/bubble.css"],
      "run_at": "document_idle"
    }
  ],

  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },

  "options_page": "options/options.html",

  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

---

## Integration with Existing Spotter

### Hybrid Approach

Visual Spotter extends (not replaces) the database Spotter:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       HYBRID SPOTTER ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐         ┌─────────────────────┐                   │
│  │  DATABASE SPOTTER   │         │  VISUAL SPOTTER     │                   │
│  │  (Server-side)      │         │  (Browser Extension)│                   │
│  │                     │         │                     │                   │
│  │  • Null rate checks │         │  • UI rendering     │                   │
│  │  • Outlier detection│         │  • Visual anomalies │                   │
│  │  • Reference checks │         │  • User experience  │                   │
│  │  • Freshness checks │         │  • Click validation │                   │
│  │                     │         │                     │                   │
│  │  Runs: Scheduled    │         │  Runs: Real-time    │                   │
│  └──────────┬──────────┘         └──────────┬──────────┘                   │
│             │                               │                               │
│             └───────────────┬───────────────┘                               │
│                             │                                               │
│                             ▼                                               │
│                    ┌─────────────────┐                                     │
│                    │ UNIFIED TRUST   │                                     │
│                    │ SCORE ENGINE    │                                     │
│                    │                 │                                     │
│                    │ Combines:       │                                     │
│                    │ • DB findings   │                                     │
│                    │ • Visual checks │                                     │
│                    │ • User reports  │                                     │
│                    └────────┬────────┘                                     │
│                             │                                               │
│                             ▼                                               │
│                    ┌─────────────────┐                                     │
│                    │ AMYGDALA ISSUES │                                     │
│                    └─────────────────┘                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Trust Score Combination

```typescript
interface HybridTrustScore {
  // From database Spotter
  databaseTrust: {
    score: number;
    factors: TrustFactors;
    lastRun: string;
  };

  // From visual Spotter
  visualTrust: {
    score: number;
    anomalies: VisualAnomaly[];
    scanTime: string;
  };

  // From user reports
  userFeedback: {
    recentReports: number;
    sentiment: 'positive' | 'neutral' | 'negative';
  };

  // Combined score
  combined: {
    score: number;
    confidence: number;
    primaryConcern: string;
  };
}

function calculateHybridTrust(
  dbTrust: number,
  visualTrust: number,
  userReports: number
): number {
  // Visual issues are most impactful - they're what users see
  if (visualTrust < 50) {
    return Math.min(dbTrust * 0.3 + visualTrust * 0.7, visualTrust + 10);
  }

  // If visual looks good but DB has issues, moderate penalty
  if (dbTrust < 50 && visualTrust > 70) {
    return dbTrust * 0.5 + visualTrust * 0.5;
  }

  // Normal case - blend all factors
  return dbTrust * 0.4 + visualTrust * 0.4 + (100 - userReports * 10) * 0.2;
}
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Page scan latency | < 500ms |
| Anomaly detection accuracy | > 85% |
| False positive rate | < 10% |
| User issue report completion | > 70% |
| Extension performance impact | < 50ms page load |
| Trust score correlation with user perception | > 0.8 |

---

## References

- [Browser MCP](https://browsermcp.io/) - AI browser automation
- [Claude in Chrome](https://claude.com/blog/claude-for-chrome) - Anthropic's browser pilot
- [Chrome Extension Content Scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Playwright MCP](https://moj-analytical-services.github.io/splink/index.html) - Browser automation

---

*This specification defines the Visual Spotter extension—bringing data trust directly to end users where they consume data.*
