# AMYGDALA - Implementation Guide

> **Updated January 2026**: Now using Next.js 15 + Supabase stack (matching seekwhy patterns).
>
> See also:
> - [Project Structure](./PROJECT_STRUCTURE.md) - Full monorepo architecture
> - [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md) - Phase-by-phase plan
> - [Meridian Bank Spec](./MERIDIAN_BANK_SPECIFICATION.md) - Simulation environment

---

## Quick Start

```bash
# 1. Create project
pnpm create turbo@latest amygdala
cd amygdala

# 2. Add apps
pnpm create next-app apps/platform --typescript --tailwind --app --src-dir=false
pnpm create next-app apps/meridian --typescript --tailwind --app --src-dir=false

# 3. Setup Supabase
supabase init
supabase start
supabase db push

# 4. Generate types
supabase gen types typescript --local > packages/database/src/types.ts

# 5. Start dev
pnpm dev
```

---

## Project Structure (Monorepo)

```
amygdala/
├── apps/
│   ├── platform/                    # Amygdala Platform
│   │   ├── app/
│   │   │   ├── (auth)/              # Login, signup
│   │   │   ├── (dashboard)/         # Protected routes
│   │   │   │   ├── agents/          # Agent Command Center
│   │   │   │   ├── catalog/         # Asset catalog
│   │   │   │   └── issues/          # Issue tracking
│   │   │   └── api/                 # API routes
│   │   ├── components/
│   │   └── lib/
│   │       ├── agents/              # Agent implementations
│   │       ├── ai/                  # Claude integration
│   │       ├── data/                # Data access layer
│   │       └── supabase/            # Supabase clients
│   │
│   └── meridian/                    # Meridian Bank (simulation)
│       ├── app/
│       │   ├── reports/             # Revenue, Branch, etc.
│       │   ├── crm/                 # Customer 360
│       │   └── admin/               # Simulation control
│       └── lib/
│           └── simulation/          # Data generation
│
├── packages/
│   ├── ui/                          # Shared components
│   └── database/                    # Types & queries
│
└── supabase/
    └── migrations/                  # Schema files
```

---

## Phase 1: Foundation Setup

### Step 1: Supabase Clients

Create `apps/platform/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `apps/platform/lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component
          }
        },
      },
    }
  )
}
```

Create `apps/platform/lib/supabase/admin.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

// Admin client bypasses RLS - use carefully
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export { adminClient }
```

### Step 2: Middleware for Auth

Create `apps/platform/middleware.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/public).*)'],
}
```

### Step 3: TypeScript Types

Create `packages/database/src/types.ts` (generated from Supabase, plus manual additions):

```typescript
// Asset types
export type AssetType = 'report' | 'dashboard' | 'table' | 'view' | 'api' | 'file' | 'application_screen';
export type DataLayer = 'consumer' | 'gold' | 'silver' | 'bronze' | 'raw';
export type FitnessStatus = 'green' | 'amber' | 'red';

export interface ColumnProfile {
  name: string;
  data_type: string;
  inferred_semantic_type?: string;
  null_count: number;
  null_percentage: number;
  distinct_count: number;
  distinct_percentage: number;
  min_value?: unknown;
  max_value?: unknown;
  mean_value?: number;
  top_values: Array<{ value: string; count: number }>;
}

export interface Profile {
  row_count: number;
  column_count: number;
  size_bytes: number;
  last_updated?: string;
  columns: ColumnProfile[];
}

export interface TrustScore {
  stars: number;
  raw_score: number;
  factors: {
    documentation: number;
    governance: number;
    quality: number;
    usage: number;
    reliability: number;
    freshness: number;
  };
  explanation: string;
  calculated_at: string;
}

export interface Asset {
  id: string;
  name: string;
  asset_type: AssetType;
  layer: DataLayer;
  description?: string;
  business_context?: string;
  tags: string[];
  owner?: string;
  steward?: string;
  upstream_assets: string[];
  downstream_assets: string[];
  quality_score?: number;
  trust_score_stars?: number;
  trust_score_raw?: number;
  trust_explanation?: string;
  fitness_status: FitnessStatus;
  created_at: string;
  updated_at: string;
}

// Issue types
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueType = 'anomaly' | 'quality_failure' | 'pipeline_failure' | 'missing_data' | 'missing_reference' | 'ownership_missing' | 'freshness';
export type IssueStatus = 'open' | 'investigating' | 'in_progress' | 'escalated' | 'pending_review' | 'resolved' | 'closed';

export interface IssueActivity {
  id: string;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  issue_type: IssueType;
  affected_assets: string[];
  root_cause_asset?: string;
  status: IssueStatus;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
}

// Agent types
export type AgentName = 'Documentarist' | 'Spotter' | 'Debugger' | 'Quality Agent' | 'Transformation Agent' | 'Trust Agent';
export type AgentStatus = 'idle' | 'running' | 'error';

export interface AgentLog {
  id: string;
  agent_name: AgentName;
  asset_id?: string;
  action: string;
  summary: string;
  details?: Record<string, unknown>;
  rating?: string;
  score?: number;
  timestamp: string;
}

export interface AgentState {
  name: AgentName;
  status: AgentStatus;
  last_run?: string;
  stats: Record<string, string | number>;
}
```

### Step 4: Zod Validation Schemas

Create `apps/platform/lib/validations/index.ts`:

```typescript
import { z } from 'zod';

export const assetCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  asset_type: z.enum(['report', 'dashboard', 'table', 'view', 'api', 'file', 'application_screen']),
  layer: z.enum(['consumer', 'gold', 'silver', 'bronze', 'raw']),
  description: z.string().optional(),
  owner: z.string().email().optional(),
});

export const issueCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  issue_type: z.enum(['anomaly', 'quality_failure', 'pipeline_failure', 'missing_data', 'missing_reference', 'ownership_missing', 'freshness']),
  affected_assets: z.array(z.string()).default([]),
  created_by: z.string(),
});

export type AssetCreate = z.infer<typeof assetCreateSchema>;
export type IssueCreate = z.infer<typeof issueCreateSchema>;
```

---

## Phase 2: Base Agent Framework

Create `apps/platform/lib/agents/base.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { adminClient } from '@/lib/supabase/admin';
import type { AgentName, AgentStatus, AgentLog, IssueSeverity, IssueType } from '@amygdala/database';

const anthropic = new Anthropic();

export interface AgentRunResult {
  success: boolean;
  stats: Record<string, number>;
  errors?: string[];
}

export interface AgentContext {
  assetId?: string;
  issueId?: string;
  reportPath?: string;
  [key: string]: unknown;
}

export abstract class BaseAgent {
  readonly name: AgentName;
  readonly description: string;
  private _status: AgentStatus = 'idle';
  private _lastRun?: Date;

  constructor(name: AgentName, description: string) {
    this.name = name;
    this.description = description;
  }

  get status(): AgentStatus {
    return this._status;
  }

  get lastRun(): Date | undefined {
    return this._lastRun;
  }

  abstract get systemPrompt(): string;
  abstract run(context?: AgentContext): Promise<AgentRunResult>;

  protected setStatus(status: AgentStatus): void {
    this._status = status;
    console.log(`[${this.name}] Status: ${status}`);
  }

  protected async logActivity(params: {
    assetId?: string;
    action: string;
    summary: string;
    details?: Record<string, unknown>;
    rating?: string;
    score?: number;
  }): Promise<void> {
    const { error } = await adminClient
      .from('agent_logs')
      .insert({
        agent_name: this.name,
        asset_id: params.assetId,
        action: params.action,
        summary: params.summary,
        details: params.details,
        rating: params.rating,
        score: params.score,
      });

    if (error) {
      console.error(`[${this.name}] Failed to log activity:`, error);
    }
  }

  protected async callLLM(messages: Array<{ role: 'user' | 'assistant'; content: string }>, maxTokens = 4096): Promise<string> {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: this.systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    throw new Error('Unexpected response type from Claude');
  }

  protected async createIssue(params: {
    title: string;
    description: string;
    severity: IssueSeverity;
    issueType: IssueType;
    affectedAssets: string[];
    assignedTo?: string;
  }): Promise<string> {
    const { data, error } = await adminClient
      .from('issues')
      .insert({
        title: params.title,
        description: params.description,
        severity: params.severity,
        issue_type: params.issueType,
        affected_assets: params.affectedAssets,
        assigned_to: params.assignedTo,
        created_by: this.name,
        status: 'open',
      })
      .select('id')
      .single();

    if (error) {
      console.error(`[${this.name}] Failed to create issue:`, error);
      throw error;
    }

    console.log(`[${this.name}] Created issue ${data.id}: ${params.title}`);
    return data.id;
  }

  protected async updateIssue(issueId: string, updates: {
    status?: string;
    resolution?: string;
    resolvedBy?: string;
  }): Promise<void> {
    const { error } = await adminClient
      .from('issues')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        resolved_at: updates.resolution ? new Date().toISOString() : undefined,
      })
      .eq('id', issueId);

    if (error) {
      console.error(`[${this.name}] Failed to update issue:`, error);
    }
  }

  async execute(context?: AgentContext): Promise<AgentRunResult> {
    this.setStatus('running');

    try {
      const result = await this.run(context);
      this._lastRun = new Date();
      this.setStatus('idle');
      return result;
    } catch (error) {
      this.setStatus('error');
      console.error(`[${this.name}] Execution failed:`, error);
      return {
        success: false,
        stats: {},
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
}
```

---

## Phase 3: Individual Agents

### Documentarist Agent

Create `backend/agents/documentarist.py`:

```python
from agents.base import BaseAgent
from services.profiler import ProfilerService
from services.lineage import LineageService
from bs4 import BeautifulSoup
import json

class DocumentaristAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Documentarist",
            description="Catalogs assets by tracing from reports to sources"
        )
        self.profiler = ProfilerService()
        self.lineage = LineageService()
    
    @property
    def system_prompt(self) -> str:
        return """You are the Documentarist agent for Amygdala. Your role is to:
1. Parse reports and identify data elements (charts, tables, KPIs)
2. Trace lineage from reports back to source tables
3. Generate meaningful descriptions based on actual data content
4. Profile tables and infer semantic types
5. Create ownership issues when owners are missing

When describing assets, focus on:
- What business purpose the data serves
- How it's used downstream
- Key characteristics and patterns
- Data quality considerations

Respond with structured JSON when analyzing reports."""
    
    async def run(self, context: dict = None) -> dict:
        self.set_status("running")
        results = {
            "assets_cataloged": 0,
            "profiles_created": 0,
            "lineage_traced": 0,
            "issues_created": 0
        }
        
        try:
            # Get reports to analyze
            reports = await self.get_reports_to_analyze(context)
            
            for report in reports:
                # Parse report structure
                parsed = await self.parse_report(report)
                
                # Trace lineage to source tables
                lineage = await self.trace_lineage(parsed)
                
                # Profile discovered tables
                for table in lineage.get("tables", []):
                    profile = await self.profiler.profile_table(table)
                    results["profiles_created"] += 1
                
                # Create/update catalog entries
                await self.update_catalog(parsed, lineage)
                results["assets_cataloged"] += len(lineage.get("tables", [])) + 1
                results["lineage_traced"] += 1
            
            self.set_status("idle")
            self.last_run = datetime.utcnow()
            
        except Exception as e:
            self.set_status("error")
            raise e
        
        return results
    
    async def parse_report(self, report_path: str) -> dict:
        """Parse an HTML report and extract structure."""
        with open(report_path, 'r') as f:
            html = f.read()
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # Extract metadata if present
        metadata_script = soup.find('script', {'id': 'report-metadata'})
        metadata = {}
        if metadata_script:
            metadata = json.loads(metadata_script.string)
        
        # Extract visual elements
        elements = {
            "title": soup.find('h1').text if soup.find('h1') else "Unknown",
            "kpis": self._extract_kpis(soup),
            "charts": self._extract_charts(soup),
            "tables": self._extract_tables(soup),
            "metadata": metadata
        }
        
        # Use LLM to generate description
        description = await self.call_llm([{
            "role": "user",
            "content": f"""Analyze this report structure and generate a business description:
            
Title: {elements['title']}
KPIs: {elements['kpis']}
Charts: {len(elements['charts'])} found
Tables: {len(elements['tables'])} found
Metadata: {metadata}

Respond with JSON containing:
- description: Business-focused description
- business_context: How this report is likely used
- key_metrics: List of important metrics tracked"""
        }])
        
        elements["analysis"] = json.loads(description)
        return elements
    
    async def trace_lineage(self, parsed_report: dict) -> dict:
        """Trace data lineage from report to sources."""
        metadata = parsed_report.get("metadata", {})
        data_sources = metadata.get("data_sources", [])
        
        lineage = {
            "report": parsed_report["title"],
            "tables": [],
            "transformations": []
        }
        
        for source in data_sources:
            table_name = source.get("table")
            query = source.get("query")
            
            # Get upstream tables
            upstream = await self.lineage.trace_upstream(table_name)
            
            lineage["tables"].append({
                "name": table_name,
                "query": query,
                "upstream": upstream
            })
        
        return lineage
    
    def _extract_kpis(self, soup) -> list:
        """Extract KPI elements from HTML."""
        kpis = []
        kpi_cards = soup.find_all('div', class_='kpi-card')
        for card in kpi_cards:
            value = card.find(class_='kpi-value')
            label = card.find(class_='kpi-label')
            if value and label:
                kpis.append({
                    "label": label.text.strip(),
                    "value": value.text.strip()
                })
        return kpis
    
    def _extract_charts(self, soup) -> list:
        """Extract chart containers from HTML."""
        return [{"id": c.get("id")} for c in soup.find_all('div', class_='chart-container')]
    
    def _extract_tables(self, soup) -> list:
        """Extract table structures from HTML."""
        tables = []
        for table in soup.find_all('table'):
            headers = [th.text.strip() for th in table.find_all('th')]
            tables.append({"headers": headers})
        return tables
```

### Spotter Agent

Create `backend/agents/spotter.py`:

```python
from agents.base import BaseAgent
from services.anomaly import AnomalyDetectionService
from datetime import datetime, timedelta
import statistics

class SpotterAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Spotter",
            description="Monitors reports for anomalies that erode trust"
        )
        self.anomaly_service = AnomalyDetectionService()
    
    @property
    def system_prompt(self) -> str:
        return """You are the Spotter agent for Amygdala. Your role is to detect anomalies 
that would make business users say "I don't trust this data."

Look for these patterns:
1. Missing data - expected values not present
2. Value anomalies - statistical outliers, sudden spikes or drops
3. Distribution shifts - proportions changed unexpectedly
4. Freshness issues - data not updated as expected
5. Completeness issues - missing categories or dimensions

When you detect an anomaly:
- Classify severity (critical/high/medium/low)
- Assess confidence (high/possible/uncertain)
- Estimate business impact
- Recommend investigation steps

Respond with structured JSON for anomaly reports."""
    
    async def run(self, context: dict = None) -> dict:
        self.set_status("running")
        results = {
            "reports_checked": 0,
            "anomalies_detected": 0,
            "issues_created": 0,
            "snapshots_stored": 0
        }
        
        try:
            # Get monitored assets
            assets = await self.get_monitored_assets(context)
            
            for asset in assets:
                # Capture current state
                current_state = await self.capture_state(asset)
                
                # Load historical baseline
                baseline = await self.load_baseline(asset["id"])
                
                # Detect anomalies
                anomalies = await self.detect_anomalies(current_state, baseline)
                
                # Process each anomaly
                for anomaly in anomalies:
                    results["anomalies_detected"] += 1
                    
                    # Create issue if significant
                    if anomaly["confidence"] == "high":
                        await self.create_issue(
                            title=anomaly["title"],
                            description=anomaly["description"],
                            severity=anomaly["severity"],
                            issue_type="anomaly",
                            affected_assets=[asset["id"]]
                        )
                        results["issues_created"] += 1
                
                # Store snapshot for future comparison
                await self.store_snapshot(asset["id"], current_state)
                results["snapshots_stored"] += 1
                results["reports_checked"] += 1
                
                # Log activity
                await self.log_activity(
                    asset_id=asset["id"],
                    action="anomaly_check",
                    summary=f"Checked for anomalies. Found {len(anomalies)} issues.",
                    details={"anomalies": anomalies}
                )
            
            self.set_status("idle")
            self.last_run = datetime.utcnow()
            
        except Exception as e:
            self.set_status("error")
            raise e
        
        return results
    
    async def detect_anomalies(self, current: dict, baseline: dict) -> list:
        """Detect various types of anomalies."""
        anomalies = []
        
        # Check for missing data
        missing = self.check_missing_data(current, baseline)
        if missing:
            anomalies.append(missing)
        
        # Check for value anomalies
        value_anomalies = self.check_value_anomalies(current, baseline)
        anomalies.extend(value_anomalies)
        
        # Check for distribution shifts
        dist_shift = self.check_distribution_shift(current, baseline)
        if dist_shift:
            anomalies.append(dist_shift)
        
        # Check freshness
        freshness = self.check_freshness(current)
        if freshness:
            anomalies.append(freshness)
        
        return anomalies
    
    def check_missing_data(self, current: dict, baseline: dict) -> dict:
        """Check if expected data is missing."""
        expected_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        if current.get("latest_date") != expected_date:
            return {
                "type": "missing_data",
                "title": f"Missing data for {expected_date}",
                "description": f"Expected data for {expected_date} but latest data is from {current.get('latest_date')}",
                "severity": "critical",
                "confidence": "high"
            }
        return None
    
    def check_value_anomalies(self, current: dict, baseline: dict) -> list:
        """Check for statistical outliers in key metrics."""
        anomalies = []
        
        for metric, value in current.get("metrics", {}).items():
            historical = baseline.get("metrics_history", {}).get(metric, [])
            
            if len(historical) >= 7:
                avg = statistics.mean(historical)
                std = statistics.stdev(historical) if len(historical) > 1 else 0
                
                if std > 0:
                    z_score = abs(value - avg) / std
                    
                    if z_score > 3:
                        severity = "critical" if z_score > 5 else "high"
                        anomalies.append({
                            "type": "value_anomaly",
                            "title": f"Anomalous {metric} value detected",
                            "description": f"{metric} is {z_score:.1f} standard deviations from normal. Current: {value}, Expected: {avg:.2f} ± {std:.2f}",
                            "severity": severity,
                            "confidence": "high",
                            "metric": metric,
                            "current_value": value,
                            "z_score": z_score
                        })
        
        return anomalies
    
    def check_distribution_shift(self, current: dict, baseline: dict) -> dict:
        """Check if distribution of categorical values has shifted."""
        current_dist = current.get("distribution", {})
        baseline_dist = baseline.get("distribution", {})
        
        # Check for missing categories
        missing = set(baseline_dist.keys()) - set(current_dist.keys())
        
        if missing:
            return {
                "type": "completeness_issue",
                "title": f"Missing categories detected",
                "description": f"Expected categories not found: {', '.join(missing)}",
                "severity": "high" if len(missing) > 2 else "medium",
                "confidence": "high",
                "missing_categories": list(missing)
            }
        return None
    
    def check_freshness(self, current: dict) -> dict:
        """Check if data is stale."""
        last_updated = current.get("last_updated")
        expected_freshness_hours = current.get("expected_freshness_hours", 24)
        
        if last_updated:
            age_hours = (datetime.utcnow() - last_updated).total_seconds() / 3600
            
            if age_hours > expected_freshness_hours * 2:
                return {
                    "type": "freshness",
                    "title": "Stale data detected",
                    "description": f"Data is {age_hours:.1f} hours old, expected within {expected_freshness_hours} hours",
                    "severity": "critical" if age_hours > expected_freshness_hours * 4 else "high",
                    "confidence": "high"
                }
        return None
```

### Quality Agent

Create `backend/agents/quality.py`:

```python
from agents.base import BaseAgent
from services.profiler import ProfilerService
import re

class QualityAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Quality Agent",
            description="Defines and enforces contextual data quality rules"
        )
        self.profiler = ProfilerService()
    
    @property
    def system_prompt(self) -> str:
        return """You are the Quality Agent for Amygdala. Your role is to:
1. Analyze data profiles and usage patterns
2. Generate appropriate quality rules based on context
3. Calibrate rules to minimize false positives
4. Route issues for remediation

Generate rules for these categories:
- Completeness: Required fields not null
- Validity: Formats match expectations (email, phone, date)
- Consistency: Cross-column logic (state matches zip, age >= 0)
- Timeliness: Data freshness requirements
- Uniqueness: No duplicate keys
- Accuracy: Business logic constraints

Respond with JSON containing rule definitions and rationale."""
    
    async def run(self, context: dict = None) -> dict:
        self.set_status("running")
        results = {
            "assets_validated": 0,
            "rules_generated": 0,
            "rules_executed": 0,
            "issues_created": 0,
            "pass_rate": 0
        }
        
        try:
            assets = await self.get_assets_to_validate(context)
            total_passed = 0
            total_rules = 0
            
            for asset in assets:
                # Generate rules if needed
                rules = await self.get_or_generate_rules(asset)
                results["rules_generated"] += len([r for r in rules if r.get("new")])
                
                # Execute validations
                validation_results = await self.execute_validations(asset, rules)
                results["rules_executed"] += len(rules)
                
                # Calculate pass rate
                passed = sum(1 for r in validation_results if r["passed"])
                total_passed += passed
                total_rules += len(rules)
                
                # Create issues for failures
                for result in validation_results:
                    if not result["passed"] and result["severity"] in ["critical", "high"]:
                        await self.create_issue(
                            title=f"Quality rule failed: {result['rule_name']}",
                            description=f"{result['description']}\nFail rate: {result['fail_rate']:.1%}",
                            severity=result["severity"],
                            issue_type="quality_failure",
                            affected_assets=[asset["id"]]
                        )
                        results["issues_created"] += 1
                
                # Update asset quality score
                asset_pass_rate = passed / len(rules) if rules else 1.0
                await self.update_quality_score(asset["id"], asset_pass_rate * 100)
                
                # Log activity
                await self.log_activity(
                    asset_id=asset["id"],
                    action="quality_validation",
                    summary=f"Validated {len(rules)} rules. Pass rate: {asset_pass_rate:.1%}",
                    rating=self.get_rating(asset_pass_rate),
                    score=asset_pass_rate * 100
                )
                
                results["assets_validated"] += 1
            
            results["pass_rate"] = (total_passed / total_rules * 100) if total_rules > 0 else 100
            self.set_status("idle")
            self.last_run = datetime.utcnow()
            
        except Exception as e:
            self.set_status("error")
            raise e
        
        return results
    
    async def generate_rules(self, asset: dict) -> list:
        """Generate quality rules based on asset profile."""
        profile = asset.get("profile", {})
        rules = []
        
        for column in profile.get("columns", []):
            col_name = column["name"]
            semantic_type = column.get("inferred_semantic_type")
            null_pct = column.get("null_percentage", 0)
            
            # Completeness rules
            if null_pct < 5:  # Column is usually populated
                rules.append({
                    "name": f"{col_name}_not_null",
                    "type": "completeness",
                    "expression": f"{col_name} IS NOT NULL",
                    "severity": "high" if null_pct < 1 else "medium",
                    "rationale": f"Column {col_name} has {null_pct:.1f}% nulls historically"
                })
            
            # Validity rules based on semantic type
            if semantic_type == "email":
                rules.append({
                    "name": f"{col_name}_valid_email",
                    "type": "validity",
                    "expression": f"REGEXP_LIKE({col_name}, '^[^@]+@[^@]+\\.[^@]+$')",
                    "severity": "medium",
                    "rationale": "Email addresses should have valid format"
                })
            
            elif semantic_type == "phone":
                rules.append({
                    "name": f"{col_name}_valid_phone",
                    "type": "validity",
                    "expression": f"REGEXP_LIKE({col_name}, '^\\+?[0-9]{{7,15}}$')",
                    "severity": "medium",
                    "rationale": "Phone numbers should be dialable"
                })
            
            elif semantic_type == "date":
                rules.append({
                    "name": f"{col_name}_valid_date",
                    "type": "validity",
                    "expression": f"TRY_TO_DATE({col_name}) IS NOT NULL",
                    "severity": "high",
                    "rationale": "Date values should be parseable"
                })
            
            # Range rules for numeric columns
            if column.get("data_type") in ["NUMBER", "FLOAT", "INTEGER"]:
                if "age" in col_name.lower():
                    rules.append({
                        "name": f"{col_name}_valid_age",
                        "type": "validity",
                        "expression": f"{col_name} BETWEEN 0 AND 150",
                        "severity": "high",
                        "rationale": "Age must be reasonable value"
                    })
                
                if "percent" in col_name.lower() or "rate" in col_name.lower():
                    rules.append({
                        "name": f"{col_name}_valid_percentage",
                        "type": "validity",
                        "expression": f"{col_name} BETWEEN 0 AND 100",
                        "severity": "high",
                        "rationale": "Percentage should be 0-100"
                    })
        
        # Use LLM for additional business rules
        llm_rules = await self.generate_business_rules(asset)
        rules.extend(llm_rules)
        
        return rules
    
    async def execute_validations(self, asset: dict, rules: list) -> list:
        """Execute quality rules against the asset."""
        results = []
        table_name = asset.get("source_table")
        
        for rule in rules:
            query = f"""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN {rule['expression']} THEN 1 ELSE 0 END) as passed
                FROM {table_name}
            """
            
            try:
                result = db.execute(query)[0]
                total, passed = result
                pass_rate = passed / total if total > 0 else 1.0
                
                results.append({
                    "rule_name": rule["name"],
                    "passed": pass_rate >= 0.95,  # 95% threshold
                    "pass_rate": pass_rate,
                    "fail_rate": 1 - pass_rate,
                    "severity": rule["severity"],
                    "description": rule["rationale"]
                })
            except Exception as e:
                results.append({
                    "rule_name": rule["name"],
                    "passed": False,
                    "error": str(e),
                    "severity": rule["severity"]
                })
        
        return results
    
    def get_rating(self, pass_rate: float) -> str:
        if pass_rate >= 0.95:
            return "Excellent"
        elif pass_rate >= 0.85:
            return "Good"
        elif pass_rate >= 0.70:
            return "Acceptable"
        elif pass_rate >= 0.50:
            return "Poor"
        else:
            return "Critical"
```

### Trust Agent

Create `backend/agents/trust.py`:

```python
from agents.base import BaseAgent
from datetime import datetime

class TrustAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Trust Agent",
            description="Calculates holistic trust scores for data assets"
        )
        
        # Trust factor weights
        self.weights = {
            "documentation": 0.15,
            "governance": 0.20,
            "quality": 0.25,
            "usage": 0.15,
            "reliability": 0.15,
            "freshness": 0.10
        }
    
    @property
    def system_prompt(self) -> str:
        return """You are the Trust Agent for Amygdala. Your role is to:
1. Calculate holistic trust scores for data assets
2. Assess current fitness-for-use (green/amber/red)
3. Generate clear explanations of trust factors
4. Incorporate user feedback into assessments

Trust factors to consider:
- Documentation: Is the asset well-documented with clear lineage?
- Governance: Does it have an owner and steward?
- Quality: What is the quality validation pass rate?
- Usage: Is it widely used in governed reports?
- Reliability: How often do issues occur? How fast are they resolved?
- Freshness: Is the data updated as expected?

Generate human-readable explanations that help users understand why an asset is or isn't trustworthy."""
    
    async def run(self, context: dict = None) -> dict:
        self.set_status("running")
        results = {
            "assets_scored": 0,
            "avg_trust_score": 0,
            "red_count": 0,
            "amber_count": 0,
            "green_count": 0
        }
        
        try:
            assets = await self.get_assets_to_score(context)
            total_score = 0
            
            for asset in assets:
                # Calculate trust score
                trust_score = await self.calculate_trust_score(asset)
                
                # Assess fitness
                fitness = await self.assess_fitness(asset)
                
                # Update counts
                if fitness["status"] == "red":
                    results["red_count"] += 1
                elif fitness["status"] == "amber":
                    results["amber_count"] += 1
                else:
                    results["green_count"] += 1
                
                # Update asset
                await self.update_asset_trust(
                    asset["id"], 
                    trust_score, 
                    fitness
                )
                
                total_score += trust_score["raw_score"]
                results["assets_scored"] += 1
                
                # Log activity
                await self.log_activity(
                    asset_id=asset["id"],
                    action="trust_calculation",
                    summary=f"Trust: {trust_score['stars']}⭐ ({trust_score['raw_score']:.2f}) | Fitness: {fitness['status'].upper()}",
                    rating=f"{trust_score['stars']} stars",
                    score=trust_score["raw_score"] * 100,
                    details={
                        "trust_factors": trust_score["factors"],
                        "fitness": fitness
                    }
                )
            
            if results["assets_scored"] > 0:
                results["avg_trust_score"] = total_score / results["assets_scored"]
            
            self.set_status("idle")
            self.last_run = datetime.utcnow()
            
        except Exception as e:
            self.set_status("error")
            raise e
        
        return results
    
    async def calculate_trust_score(self, asset: dict) -> dict:
        """Calculate comprehensive trust score."""
        factors = {}
        
        # Documentation factor (0-1)
        factors["documentation"] = self.score_documentation(asset)
        
        # Governance factor (0-1)
        factors["governance"] = self.score_governance(asset)
        
        # Quality factor (0-1)
        factors["quality"] = self.score_quality(asset)
        
        # Usage factor (0-1)
        factors["usage"] = self.score_usage(asset)
        
        # Reliability factor (0-1)
        factors["reliability"] = self.score_reliability(asset)
        
        # Freshness factor (0-1)
        factors["freshness"] = self.score_freshness(asset)
        
        # Weighted combination
        raw_score = sum(
            factors[f] * self.weights[f] 
            for f in factors
        )
        
        # Convert to stars (1-5)
        stars = max(1, min(5, round(raw_score * 5)))
        
        # Generate explanation
        explanation = await self.generate_explanation(asset, factors, stars)
        
        return {
            "stars": stars,
            "raw_score": raw_score,
            "factors": factors,
            "explanation": explanation,
            "calculated_at": datetime.utcnow()
        }
    
    def score_documentation(self, asset: dict) -> float:
        score = 0.0
        if asset.get("description"):
            score += 0.3
        if asset.get("business_context"):
            score += 0.2
        if asset.get("upstream_assets"):
            score += 0.25
        if asset.get("downstream_assets"):
            score += 0.25
        return score
    
    def score_governance(self, asset: dict) -> float:
        score = 0.0
        if asset.get("owner"):
            score += 0.5
        if asset.get("steward"):
            score += 0.3
        if asset.get("classification"):
            score += 0.2
        return score
    
    def score_quality(self, asset: dict) -> float:
        quality_score = asset.get("quality_score")
        if quality_score is not None:
            return quality_score / 100
        return 0.5  # Unknown quality = moderate score
    
    def score_usage(self, asset: dict) -> float:
        usage = asset.get("usage_statistics", {})
        access_freq = usage.get("access_frequency", 0)
        unique_users = usage.get("unique_users", 0)
        freq_score = min(1.0, access_freq / 100)
        user_score = min(1.0, unique_users / 20)
        return (freq_score + user_score) / 2
    
    def score_reliability(self, asset: dict) -> float:
        issues = asset.get("related_issues", [])
        open_issues = sum(1 for i in issues if i.get("status") == "open")
        if open_issues == 0:
            return 1.0
        elif open_issues <= 2:
            return 0.7
        elif open_issues <= 5:
            return 0.4
        else:
            return 0.1
    
    def score_freshness(self, asset: dict) -> float:
        profile = asset.get("profile", {})
        last_updated = profile.get("last_updated")
        if not last_updated:
            return 0.5
        age_hours = (datetime.utcnow() - last_updated).total_seconds() / 3600
        expected_hours = asset.get("expected_freshness_hours", 24)
        if age_hours <= expected_hours:
            return 1.0
        elif age_hours <= expected_hours * 2:
            return 0.7
        elif age_hours <= expected_hours * 4:
            return 0.4
        else:
            return 0.1
    
    async def assess_fitness(self, asset: dict) -> dict:
        """Assess current fitness for use."""
        issues = asset.get("related_issues", [])
        
        # Check for critical issues
        critical_issues = [i for i in issues if i.get("severity") == "critical" and i.get("status") == "open"]
        if critical_issues:
            return {
                "status": "red",
                "reason": f"{len(critical_issues)} critical issue(s) affecting this asset",
                "blocking_issues": critical_issues
            }
        
        # Check freshness
        profile = asset.get("profile", {})
        last_updated = profile.get("last_updated")
        if last_updated:
            age_hours = (datetime.utcnow() - last_updated).total_seconds() / 3600
            expected_hours = asset.get("expected_freshness_hours", 24)
            if age_hours > expected_hours * 4:
                return {
                    "status": "red",
                    "reason": f"Data is {age_hours:.0f} hours old, expected within {expected_hours} hours"
                }
        
        # Check for amber conditions
        open_issues = [i for i in issues if i.get("status") == "open"]
        quality_score = asset.get("quality_score", 100)
        
        if open_issues or quality_score < 80:
            return {
                "status": "amber",
                "reason": f"{len(open_issues)} open issues, quality score {quality_score:.0f}%"
            }
        
        return {
            "status": "green",
            "reason": "No issues detected, data fresh, quality validated"
        }
```

---

## Phase 4: Frontend Implementation

### Main App Structure

Create `frontend/src/App.tsx`:

```tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Catalog } from './pages/Catalog';
import { AssetDetail } from './pages/AssetDetail';
import { Issues } from './pages/Issues';
import { AgentChat } from './pages/AgentChat';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/catalog/:id" element={<AssetDetail />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/agents/chat" element={<AgentChat />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
```

### Agent Card Component

Create `frontend/src/components/agents/AgentCard.tsx`:

```tsx
import React from 'react';
import { 
  BookOpen, Eye, Wrench, CheckCircle, 
  RefreshCw, Star, Play 
} from 'lucide-react';

interface AgentCardProps {
  name: string;
  description: string;
  status: 'idle' | 'running' | 'error';
  lastRun: string;
  stats: Record<string, string | number>;
  onRun: () => void;
}

const agentIcons: Record<string, React.ReactNode> = {
  'Documentarist': <BookOpen className="w-8 h-8" />,
  'Spotter': <Eye className="w-8 h-8" />,
  'Debugger': <Wrench className="w-8 h-8" />,
  'Quality Agent': <CheckCircle className="w-8 h-8" />,
  'Transformation Agent': <RefreshCw className="w-8 h-8" />,
  'Trust Agent': <Star className="w-8 h-8" />,
};

const agentColors: Record<string, string> = {
  'Documentarist': 'text-purple-500',
  'Spotter': 'text-cyan-500',
  'Debugger': 'text-orange-500',
  'Quality Agent': 'text-green-500',
  'Transformation Agent': 'text-pink-500',
  'Trust Agent': 'text-yellow-500',
};

const statusColors: Record<string, string> = {
  idle: 'bg-gray-200',
  running: 'bg-green-500 animate-pulse',
  error: 'bg-red-500',
};

export function AgentCard({ name, description, status, lastRun, stats, onRun }: AgentCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={agentColors[name]}>
          {agentIcons[name]}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
          <span className="text-sm text-gray-500 capitalize">{status}</span>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{name}</h3>
      <p className="text-sm text-gray-500 mb-4">Last run: {lastRun}</p>
      
      <div className="space-y-2 mb-4">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-gray-600">{key}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
      
      <button
        onClick={onRun}
        disabled={status === 'running'}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 
                   hover:bg-gray-200 rounded-md text-sm font-medium transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play className="w-4 h-4" />
        Run Now
      </button>
    </div>
  );
}
```

### Trust Indicator Component

Create `frontend/src/components/catalog/TrustIndicator.tsx`:

```tsx
import React from 'react';
import { Star, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface TrustIndicatorProps {
  stars: number;
  rawScore: number;
  fitnessStatus: 'green' | 'amber' | 'red';
  fitnessReason?: string;
  compact?: boolean;
}

export function TrustIndicator({ 
  stars, 
  rawScore, 
  fitnessStatus, 
  fitnessReason,
  compact = false 
}: TrustIndicatorProps) {
  const fitnessColors = {
    green: 'text-emerald-500 bg-emerald-50',
    amber: 'text-amber-500 bg-amber-50',
    red: 'text-red-500 bg-red-50',
  };
  
  const fitnessIcons = {
    green: <CheckCircle className="w-4 h-4" />,
    amber: <AlertTriangle className="w-4 h-4" />,
    red: <AlertCircle className="w-4 h-4" />,
  };
  
  const fitnessLabels = {
    green: 'HEALTHY',
    amber: 'DEGRADED',
    red: 'CRITICAL',
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
          ))}
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${fitnessColors[fitnessStatus]}`}>
          {fitnessIcons[fitnessStatus]}
          {fitnessLabels[fitnessStatus]}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-gray-500 mb-1">Trust Score</div>
          <div className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">({rawScore.toFixed(1)})</span>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${fitnessColors[fitnessStatus]}`}>
          {fitnessIcons[fitnessStatus]}
          <span className="font-medium">{fitnessLabels[fitnessStatus]}</span>
        </div>
      </div>
      
      {fitnessReason && (
        <p className="text-sm text-gray-600">{fitnessReason}</p>
      )}
    </div>
  );
}
```

---

## Phase 5: Simulation Framework

### Data Generator

Create `simulation/data_generator.py`:

```python
import pandas as pd
import numpy as np
from faker import Faker
from datetime import datetime, timedelta
import random

fake = Faker()

class DataGenerator:
    """Generates realistic test data for simulation."""
    
    def __init__(self, seed: int = 42):
        Faker.seed(seed)
        np.random.seed(seed)
        random.seed(seed)
    
    def generate_customers(self, count: int = 1000) -> pd.DataFrame:
        """Generate customer master data."""
        customers = []
        
        for i in range(count):
            email = fake.email() if random.random() > 0.05 else f"invalid-email-{i}"
            phone = fake.phone_number() if random.random() > 0.1 else f"bad-{i}"
            
            customers.append({
                'customer_id': f'C-{i:05d}',
                'name': fake.name(),
                'email': email,
                'phone': phone,
                'address': fake.address().replace('\n', ', '),
                'city': fake.city(),
                'state': fake.state_abbr(),
                'zip_code': fake.zipcode(),
                'segment': random.choice(['Enterprise', 'SMB', 'Consumer']),
                'created_date': fake.date_between(start_date='-3y', end_date='today'),
                'lifetime_value': round(random.uniform(100, 50000), 2)
            })
        
        return pd.DataFrame(customers)
    
    def generate_orders(self, customers: pd.DataFrame, days: int = 90) -> pd.DataFrame:
        """Generate order transactions."""
        orders = []
        customer_ids = customers['customer_id'].tolist()
        start_date = datetime.now() - timedelta(days=days)
        
        for day in range(days):
            current_date = start_date + timedelta(days=day)
            daily_orders = int(np.random.normal(100, 20))
            
            for _ in range(max(0, daily_orders)):
                orders.append({
                    'order_id': f'O-{len(orders):07d}',
                    'customer_id': random.choice(customer_ids),
                    'order_date': current_date.strftime('%Y-%m-%d'),
                    'amount': round(random.uniform(10, 500), 2),
                    'status': random.choice(['completed', 'pending', 'cancelled']),
                    'branch_id': random.choice([f'BR-{i:03d}' for i in range(1, 21)])
                })
        
        return pd.DataFrame(orders)
    
    def generate_branches(self, count: int = 20) -> pd.DataFrame:
        """Generate branch reference data."""
        branches = []
        for i in range(1, count + 1):
            branches.append({
                'branch_id': f'BR-{i:03d}',
                'branch_name': f'{fake.city()} Branch',
                'region': random.choice(['East', 'West', 'North', 'South', 'Central']),
                'manager': fake.name(),
                'opened_date': fake.date_between(start_date='-10y', end_date='-1y')
            })
        return pd.DataFrame(branches)


class IssueInjector:
    """Injects controlled issues into data for testing."""
    
    @staticmethod
    def inject_nulls(df: pd.DataFrame, column: str, percentage: float) -> pd.DataFrame:
        df = df.copy()
        mask = np.random.random(len(df)) < percentage
        df.loc[mask, column] = None
        return df
    
    @staticmethod
    def inject_format_issues(df: pd.DataFrame, column: str, bad_format: str, percentage: float) -> pd.DataFrame:
        df = df.copy()
        mask = np.random.random(len(df)) < percentage
        df.loc[mask, column] = bad_format
        return df
    
    @staticmethod
    def inject_outliers(df: pd.DataFrame, column: str, multiplier: float, percentage: float) -> pd.DataFrame:
        df = df.copy()
        mask = np.random.random(len(df)) < percentage
        df.loc[mask, column] = df.loc[mask, column] * multiplier
        return df
    
    @staticmethod
    def remove_recent_data(df: pd.DataFrame, date_column: str, days: int) -> pd.DataFrame:
        df = df.copy()
        cutoff = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        return df[df[date_column] < cutoff]


def setup_demo_scenario(scenario: str = "all"):
    """Set up data for demo scenarios."""
    generator = DataGenerator()
    injector = IssueInjector()
    
    customers = generator.generate_customers(5000)
    orders = generator.generate_orders(customers, days=90)
    branches = generator.generate_branches(20)
    
    if scenario in ["missing_data", "all"]:
        orders = injector.remove_recent_data(orders, 'order_date', days=1)
    
    if scenario in ["quality_issues", "all"]:
        customers = injector.inject_format_issues(customers, 'phone', 'INVALID', percentage=0.15)
        customers = injector.inject_format_issues(customers, 'email', 'not-an-email', percentage=0.08)
    
    if scenario in ["anomaly", "all"]:
        spike_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
        mask = orders['order_date'] == spike_date
        orders.loc[mask, 'amount'] = orders.loc[mask, 'amount'] * 10
    
    return {
        'customers': customers,
        'orders': orders,
        'branches': branches
    }
```

---

## Docker Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - SNOWFLAKE_ACCOUNT=${SNOWFLAKE_ACCOUNT}
      - SNOWFLAKE_USER=${SNOWFLAKE_USER}
      - SNOWFLAKE_PASSWORD=${SNOWFLAKE_PASSWORD}
      - SNOWFLAKE_WAREHOUSE=${SNOWFLAKE_WAREHOUSE}
      - SNOWFLAKE_DATABASE=${SNOWFLAKE_DATABASE}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./backend:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm start
```

---

## Quick Start Commands

```bash
# 1. Clone and setup
git clone <repository>
cd amygdala

# 2. Create environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start services
docker-compose up -d

# 4. Initialize database
docker-compose exec backend python -c "from database.connection import init_db; init_db()"

# 5. Generate test data
docker-compose exec backend python -c "from simulation.data_generator import setup_demo_scenario; setup_demo_scenario('all')"

# 6. Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## Implementation Checklist

### Week 1-2: Foundation
- [ ] Project structure created
- [ ] Database schema deployed
- [ ] FastAPI backend running
- [ ] React frontend with routing
- [ ] Basic CRUD for assets

### Week 3-4: Documentarist
- [ ] HTML report parser
- [ ] Lineage tracing
- [ ] Profiling service
- [ ] Catalog updates

### Week 5-6: Spotter
- [ ] Anomaly detection algorithms
- [ ] Snapshot storage
- [ ] Alert creation
- [ ] Historical comparison

### Week 7-8: Debugger & Quality
- [ ] Root cause analysis
- [ ] Auto-remediation
- [ ] Rule generation
- [ ] Validation execution

### Week 9-10: Transformation & Trust
- [ ] Transformation scripts
- [ ] Chat interface
- [ ] Trust calculation
- [ ] Fitness assessment

### Week 11-12: Integration
- [ ] Agent orchestration
- [ ] Full demo scenarios
- [ ] UI polish
- [ ] Documentation

---

*This guide provides the essential implementation details for Claude Code. Refer to AMYGDALA_SPECIFICATION.md for complete architecture and design documentation.*
