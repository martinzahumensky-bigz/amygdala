# Amygdala - Roadmap

## Quick Prototype Phase (Target: 2-3 weeks)

### FEAT-001: Project Foundation
**Status:** Completed
**Original Prompt:** "Create the Ataccama Amygdala platform and test application"

- [x] Monorepo setup (Turborepo + pnpm)
- [x] Platform app (Next.js 15)
- [x] Meridian Bank app (Next.js 15)
- [x] Shared UI package
- [x] Shared database types
- [x] Supabase schema deployed
- [x] GitHub repository created

---

### FEAT-002: Platform Dashboard Layout
**Status:** Completed
**GitHub Issue:** #1
**Original Prompt:** "Please make sure the design is as close as possible to ataccama one agentic platform design"

- [x] Sidebar navigation component with collapsible sections
- [x] Header with breadcrumbs, user menu, dark mode toggle
- [x] Dashboard shell/layout with responsive design
- [x] Complete page layouts: Home, AI Agents, Catalog, Issues, Jobs, Quality, Reports, Search, Settings
- [x] Shared UI components: Avatar, Input, QualityBar, Tag, Tooltip, Dropdown
- [x] Dark mode support
- [x] Ataccama ONE-inspired design: purple accent, clean tables, filter pills, kanban boards

---

### FEAT-003: Agent Command Center
**Status:** Completed
**GitHub Issue:** TBD

- [x] Agent cards with status indicators
- [x] "Run Now" functionality
- [x] Activity feed
- [x] Agent statistics display

---

### FEAT-004: Spotter Agent Implementation
**Status:** Completed
**GitHub Issue:** #2
**Original Prompt:** "Implement the Spotter Agent - the heart of the platform"

- [x] Base agent framework with Claude API integration
- [x] Missing data detection (null rate checks)
- [x] Value anomaly detection (z-score analysis)
- [x] Invalid reference detection (foreign key validation)
- [x] Freshness checking (data staleness)
- [x] Issue creation in amygdala.issues
- [x] Activity logging to amygdala.agent_logs
- [x] API endpoints for running agents
- [x] Interactive Agents page with real-time status

---

### FEAT-005: Issues Management
**Status:** Completed
**GitHub Issue:** TBD

- [x] Issues list page with Kanban board layout
- [x] Status filtering and severity filtering
- [x] Status workflow (open → investigating → in_progress → resolved → closed)
- [x] Inline status update via dropdown
- [x] Summary stats cards by status
- [x] Agent run history with detailed logs

---

### FEAT-006: Catalog Browser
**Status:** Completed
**GitHub Issue:** TBD

- [x] Asset list with filters (layer, type, fitness status)
- [x] Asset seeding for Meridian Bank data
- [x] Trust indicators (stars, quality bar, RAG fitness)
- [x] Layer-based organization (consumer, gold, silver, bronze, raw)
- [x] Search functionality
- [x] Summary cards with layer counts and health status

---

### FEAT-010: Data Trust Index
**Status:** Completed
**Original Prompt:** "Implement Data Trust Index as described in specification"

- [x] Trust calculator with 6 weighted factors
  - Documentation (15%): description, business context, lineage
  - Governance (20%): ownership, stewardship, classification
  - Quality (25%): quality scores, active issues
  - Usage (15%): downstream consumption, active users
  - Reliability (15%): pipeline stability, issue resolution
  - Freshness (10%): data recency, refresh schedules
- [x] Trust Index API endpoint
- [x] Trust Index dashboard page with visualizations
- [x] Factor breakdown with progress bars
- [x] Improvement recommendations
- [x] Asset-level trust scores table

---

### FEAT-011: Home Dashboard Widgets
**Status:** Completed

- [x] Real-time stats (assets, issues, agents, quality)
- [x] Trust Index widget with gauge
- [x] Asset health distribution
- [x] Agent status cards with run buttons
- [x] Recent issues feed
- [x] Top assets by quality table
- [x] Auto-refresh every 30 seconds

---

### FEAT-007: Meridian Bank Data Generation
**Status:** Completed

- [x] Customer data generator (5000 customers)
- [x] Transaction generator (6 months)
- [x] Branch reference data
- [x] Seed script with API endpoint
- [x] Intentional quality issues (15% bad phones, 8% bad emails, 2% unknown branches)

---

### FEAT-008: Meridian Bank Reports
**Status:** Completed

- [x] Daily Revenue Report page
- [x] Branch Performance page
- [x] Data freshness indicators
- [x] Admin panel for seeding data

---

### FEAT-009: Platform Enhancement - Agents, Issues, Assets & Chat Integration
**Status:** Completed
**GitHub Issue:** #3
**Original Prompt:** "Implement comprehensive platform enhancement with Documentarist, Debugger, Operator agents, issue detail page, asset detail page, and integrated chat experience"

**Phase 1: Agent Page Quick Wins**
- [x] Run History button on agent cards
- [x] Clickable summary tiles
- [x] Enhanced runs API with agent filter

**Phase 2: Documentarist Agent (PRIORITY)**
- [x] Auto-discovery of data assets
- [x] Schema scanning and profiling
- [x] AI-generated descriptions
- [x] Ownership issue creation
- [x] Scheduled execution support

**Phase 3: Issue Detail Page**
- [x] Full issue detail page with agent reasoning
- [x] Sample failed records display
- [x] Workflow timeline visualization
- [x] "Analyze with Debugger" action

**Phase 4: Debugger Agent**
- [x] Root cause analysis
- [x] Lineage tracing
- [x] Solution proposal
- [x] Issue workflow integration

**Phase 5: Asset Detail Page**
- [x] Trust factor breakdown (6 factors)
- [x] Per-factor recommendations
- [x] Sample data preview
- [x] Lineage visualization

**Phase 6: Integrated Chat**
- [x] ChatContext provider
- [x] ChatDrawer component
- [x] Context-aware chat from issues/assets
- [x] Pre-filled prompts

**Phase 7: Operator Agent**
- [x] Metadata updates (owner, steward, description)
- [x] Issue resolution (resolve, close)
- [x] Approved action execution (with confirmation)
- [x] Pipeline refresh triggers
- [x] Fix execution with safety checks

---

### FEAT-016: Orchestrator Agent Chat Interface
**Status:** Completed

- [x] Orchestrator agent with Claude API integration
- [x] Chat API endpoint with conversation history
- [x] Chat UI with message bubbles and suggestions
- [x] Natural language queries for data quality
- [x] Action markers for agent coordination
- [x] Real-time data context injection
- [x] Sidebar navigation link

---

### FEAT-017: Enhanced Catalog Pages with Tabbed Interface
**GitHub Issue:** #4
**Status:** Completed
**Original Prompt:** "Improve cataloging pages with comprehensive tabs for overview, profiling, quality, preview, lineage, and transformations"

**Overview Tab (Documentarist)**
- [x] Dataset metadata (name, type, layer, source system)
- [x] Business description and context
- [x] Sensitive data indicators
- [x] Business terms/glossary mapping
- [x] Data usage information

**Profiling Tab**
- [x] Column-level statistics (null %, distinct, min/max/mean)
- [x] Data format patterns and masks
- [x] AI-interpreted anomaly highlights
- [x] Semantic type detection

**Quality Tab**
- [x] Overall quality score with breakdown
- [x] Applied quality rules list
- [x] Attribute-level quality indicators

**Preview Tab**
- [x] Paginated sample data table
- [x] Column type indicators
- [x] NULL value highlighting

**Lineage Tab**
- [x] Visual lineage diagram
- [x] AI-explained data flow
- [x] Pipeline/transformation details

**Transformations Tab**
- [x] Agent-generated improvements
- [x] Transformation history

---

### FEAT-018: Ataccama Salesforce Data Integration (was FEAT-012)
**Status:** Planned
**GitHub Issue:** TBD
**Original Prompt:** "Add Ataccama Salesforce data to Meridian app to showcase real enterprise data patterns"

**Purpose:** Demonstrate Amygdala with realistic enterprise CRM data patterns, showing how data trust issues manifest in Salesforce-like consumer data.

**Key Components:**
- [ ] Salesforce-style data model (Accounts, Contacts, Opportunities, Leads)
- [ ] Realistic data quality issues (duplicate accounts, stale contacts, incomplete opportunities)
- [ ] CRM-specific trust factors (data completeness, owner assignment, activity recency)
- [ ] Salesforce-style reports and dashboards in Meridian app
- [ ] Cross-system lineage (Salesforce → Meridian data warehouse)

**Implementation Details:** See `docs/FEAT-012-SALESFORCE-SPEC.md`

---

### FEAT-013: Amygdala MCP Server - AI Agent Data Trust Layer
**Status:** Planned
**GitHub Issue:** TBD
**Original Prompt:** "Showcase MCP integration with Claude demonstrating contrast between AI without vs with Amygdala"

**Purpose:** Build an MCP server that provides AI agents with data trust context, demonstrating how Amygdala prevents AI hallucinations and incorrect data interpretation.

**The Problem This Solves:**
AI agents querying data today face critical issues:
1. No awareness of data quality or active issues
2. No understanding of data freshness or staleness
3. Cannot distinguish trusted vs untrusted sources
4. Present uncertain data with false confidence
5. No feedback loop to report anomalies
6. Miss business context and semantic meaning

**Key Demo Scenarios:**
- [ ] **Without Amygdala:** Claude queries revenue data, misses that yesterday's data is missing, gives confident but wrong answer
- [ ] **With Amygdala:** Claude gets trust context, warns about data gap, suggests waiting for pipeline fix
- [ ] **Without Amygdala:** Claude interprets branch codes literally, doesn't know some are test branches
- [ ] **With Amygdala:** Claude knows business context, filters test data, explains data lineage

**MCP Server Tools:**
- [ ] `amygdala_query` - Query data with trust context injection
- [ ] `amygdala_get_trust_score` - Get trust score for any asset
- [ ] `amygdala_check_issues` - Check active issues affecting an asset
- [ ] `amygdala_get_lineage` - Understand data provenance
- [ ] `amygdala_report_anomaly` - Allow AI to report suspected issues
- [ ] `amygdala_get_freshness` - Check when data was last updated

**Implementation Details:** See `docs/FEAT-013-MCP-SERVER-SPEC.md`

---

### FEAT-014: Visual Spotter & Data Trust Bubble
**Status:** Planned
**GitHub Issue:** TBD
**Original Prompt:** "Create a data trust bot embedded in applications that looks at UI like a human and validates data visually"

**Purpose:** Extend Spotter to look at data the way humans do—through the actual UI—instead of only querying databases.

**The Problem:**
- Current Spotter only queries database
- Database truth ≠ Presentation truth (what users SEE)
- Users distrust data based on visual anomalies (missing charts, "[Unknown]" labels, stale dates)

**Solution: Chrome Extension + Floating Widget**
- **Data Trust Bubble** - Floating widget like 100sharp.com showing real-time trust score
- **Visual Scanner** - AI-powered DOM analysis to detect visual anomalies
- **Click-Through Validation** - Navigate UI like a human to validate data
- **Issue Reporting** - Let users report issues directly from the bubble

**Key Features:**
- [ ] Chrome extension with content script for DOM reading
- [ ] Floating "eye" widget showing trust score (green/amber/red)
- [ ] Visual anomaly detection (missing data, "[Unknown]", errors)
- [ ] Claude-powered screenshot analysis for complex anomalies
- [ ] Click-through validation using Chrome DevTools Protocol
- [ ] User issue reporting with auto-captured context
- [ ] Real-time trust updates as page changes

**Implementation Details:** See `docs/FEAT-014-VISUAL-SPOTTER-SPEC.md`

---

### FEAT-015: Mastering Agent
**Status:** Planned
**GitHub Issue:** TBD
**Original Prompt:** "Create agent to match and merge data from different sources like Salesforce + HubSpot"

**Purpose:** AI-powered data matching, merging, and deduplication that automatically devises matching rules based on profiling.

**The Problem:**
- Manual data matching is painful (export → Excel → VLOOKUP → manual review)
- Name variations cause false negatives ("Acme Corp" vs "ACME Corporation")
- No confidence scores on matches
- No lineage after merge

**Solution: Conversation-Driven Matching**
```
User: "Match Salesforce accounts with HubSpot companies"

Mastering Agent:
1. Profiles both sources
2. Devises matching strategy (domain → fuzzy name → phone)
3. Executes matching with confidence scores
4. Presents results for review
5. Creates golden master records with full lineage
```

**Key Features:**
- [ ] Natural language job initiation
- [ ] Automatic source profiling (fill rate, patterns, semantic types)
- [ ] AI rule generation based on profiling
- [ ] Multi-stage matching (exact → fuzzy → probabilistic)
- [ ] Interactive match review UI
- [ ] Duplicate detection within single source
- [ ] Survivorship rules for golden record construction
- [ ] Full lineage tracking

**Implementation Details:** See `docs/FEAT-015-MASTERING-AGENT-SPEC.md`

---

## MVP Phase (Weeks 4-8)

### Quality Agent
**Status:** Completed ✅
**Implemented in:** FEAT-009 & FEAT-017

- [x] Rule generation based on column profiling
- [x] Rule types: null_check, range_check, pattern_check, uniqueness, referential, custom
- [x] Rule validation with pass/fail rates
- [x] Issue creation for failed validations
- [x] Quality scoring per asset
- [x] Quality tab in catalog pages

---

### Trust Agent
**Status:** Completed ✅
**Implemented in:** FEAT-010

- [x] 6-factor trust calculation (Documentation, Governance, Quality, Usage, Reliability, Freshness)
- [x] Trust score monitoring and trend detection
- [x] Issue creation for trust drops (>15% alert, >25% critical)
- [x] Low trust asset flagging
- [x] Historical snapshots for trend analysis
- [x] AI-powered trust analysis

---

### Documentarist Agent
**Status:** Completed ✅
**Implemented in:** FEAT-009 Phase 2

- [x] Auto-discovery of data assets
- [x] Schema scanning and column profiling
- [x] AI-generated descriptions
- [x] Sensitive data detection (PII, financial, etc.)
- [x] Business term mapping
- [x] Ownership issue creation

---

### Agent Orchestration
**Status:** Completed ✅
**Implemented in:** FEAT-016

- [x] Orchestrator agent with Claude API integration
- [x] Multi-agent tool coordination
- [x] Context-aware chat interface
- [x] Natural language to agent action translation
- [x] Real-time data context injection

---

### FEAT-020: Data Structure Tab & Asset Editing
**Status:** Completed
**GitHub Issue:** [#7](https://github.com/martinzahumensky-bigz/amygdala/issues/7)
**Original Prompt:** "Add Data Structure tab with column details, quality rules per column, business terms, PII classifications. Add inline editing for owner, steward, and classification."

**Key Components:**
- [x] Database migration for column_profiles (description, business_terms, classifications, highlights)
- [x] Column update API endpoint (/api/assets/[assetId]/columns)
- [x] Data Structure tab UI with expandable column rows
- [x] Classification tag chips (PII=red, PHI=orange, PCI=purple, etc.)
- [x] Inline editing for owner, steward, classification
- [x] Documentarist enhancement for per-column metadata
- [x] Badge component updated with "outline" variant

---

### FEAT-021: Data Products - Asset Grouping
**Status:** Completed
**GitHub Issue:** [#6](https://github.com/martinzahumensky-bigz/amygdala/issues/6)
**Original Prompt:** "Implement new page in catalog which would allow to group assets to logical data products (e.g., Marketing, Finance)"

**Research:** Based on Atlan/Collibra best practices and data mesh principles:
- Data Products are first-class entities with ownership, lifecycle, and contracts
- Many-to-many relationship between products and assets
- Lifecycle: draft → published → deprecated → retired
- Domain-based organization (Finance, Marketing, Operations, etc.)

**Key Components:**
- [x] Database migration for data_products and data_product_assets tables
- [x] API routes for products CRUD (/api/products, /api/products/[id]/assets)
- [x] Data Products listing page with grid/list views
- [x] Create/Edit product modal with domain, owner, status fields
- [x] Product detail page with Overview, Assets, Quality tabs
- [x] Add/Remove assets drawer with search and multi-select
- [x] Lifecycle status management (draft/published/deprecated/retired)
- [x] Sidebar navigation update with Data Products link
- [x] Seed data with sample products (Executive Analytics, Customer Intelligence, etc.)
- [x] Specification document: `docs/FEAT-020-DATA-PRODUCTS-SPEC.md`

---

### FEAT-019: Transformation Agent
**Status:** Completed (Core)
**GitHub Issue:** [#5](https://github.com/martinzahumensky-bigz/amygdala/issues/5)
**Original Prompt:** "Implement agent to transform and repair data based on quality rules and agent recommendations"

**Purpose:** Execute data repairs and transformations suggested by other agents (Spotter, Quality, Debugger) with approval workflows and full lineage tracking.

**Key Capabilities:**
- [x] Database schema for transformation plans, approvals, logs, iterations, snapshots
- [x] TransformationAgent class with self-improving iteration loop
- [x] Code generation with Claude AI
- [x] Execute and evaluate in sandbox (simulated - E2B integration pending)
- [x] Preview changes before applying
- [x] Approval workflow with auto-approve for low-risk
- [x] API endpoints (plan, history, approve, reject, execute)
- [x] Transformations dashboard page (`/dashboard/transformations`)
- [x] TransformationPreviewModal component with code/iterations tabs
- [x] "Apply Fix" button on issue detail page
- [x] Sidebar navigation integration
- [ ] E2B sandbox integration for real code execution (production)
- [ ] Full data restoration for rollback (production)

**Implementation Details:** See `docs/FEAT-019-TRANSFORMATION-AGENT-SPEC.md`

---

### FEAT-022: Enhanced Data Trust Index Visualization
**Status:** Completed
**GitHub Issue:** [#8](https://github.com/martinzahumensky-bigz/amygdala/issues/8)
**Original Prompt:** "Implement enhanced trust index visualization with at-a-glance view, spider chart, and improved detail panel"

**Purpose:** Redesign the Data Trust Index visualization with three tiers of insight: at-a-glance view (Trustpilot-style), spider/radar chart, and detailed bar chart.

**Key Concept: Static Trust vs Live Trust**
- **Static Trust:** Documentation, Governance, Lineage, Classification (rarely changes)
- **Live Trust:** Freshness, Active Issues, Quality validation (dynamic operational state)

**Key Components:**
- [x] TrustAtGlance component with circular gauge, 5-star rating, AI summary
- [x] TrustSpiderChart component with 6-axis radar visualization
- [x] TrustDetailPanel component with spider/bar chart toggle
- [x] StarRating reusable component
- [x] Enhanced trust calculator with TrustInsight interface
- [x] Static/Live trust separation with AI-generated summaries
- [x] Asset detail page integration
- [x] Trust index page spider chart toggle

---

### FEAT-023: Automation Agent - Custom Trigger-Action Workflows
**Status:** In Progress
**GitHub Issue:** [#9](https://github.com/martinzahumensky-bigz/amygdala/issues/9)
**Original Prompt:** "Research atlan.com and airtable.com automations - allow users to define logic executed based on triggers or schedules, eg check catalog items without owner and create issue, or auto-assign issues based on description type"

**Purpose:** Enable users to create custom, rule-based workflows that execute automatically based on triggers or schedules. Inspired by Atlan Playbooks, Airtable Automations, and n8n workflows.

**Research Summary:**
- **Atlan Playbooks:** Event-driven governance automation, auto-tag PII, propagate classifications
- **Airtable:** 8 trigger types, dynamic tokens, AI actions ("Generate with AI")
- **n8n:** Node-based workflows, branching logic, sub-workflows, error handling

**Trigger Types:**
- [x] Scheduled (cron, daily, weekly, monthly intervals)
- [x] Record created/updated (assets, issues, data products)
- [x] Record matches condition (e.g., assets without owner)
- [x] Agent completed (with result filters)
- [x] Webhook received (external integration)
- [x] Manual button click

**Action Types:**
- [x] Update record (metadata, status, owner assignment)
- [x] Create record (issues, data products)
- [x] Send notification (email, Slack, webhook)
- [x] Run agent (Spotter, Debugger, Quality, etc.)
- [x] Generate with AI (classification, content generation)
- [x] Execute external webhook
- [x] Conditional branching (if/else logic)

**Example Use Cases:**
1. Daily check for unowned assets → create governance issue
2. Auto-assign critical issues based on AI classification
3. Alert owner when trust score drops below threshold
4. Auto-classify issue type using AI when created

**Key Components:**
- [x] Database schema (automations, runs, schedules, webhooks)
- [x] Automation engine with trigger/condition/action evaluation
- [x] Token system for dynamic values (`{{record.name}}`, `{{record.owner}}`)
- [x] Automations list page with enable/disable toggle
- [x] Visual automation builder modal (basic)
- [x] Run history viewer
- [x] Pre-built automation templates (4 seed templates)

**Remaining Work:**
- [ ] Enhanced automation builder UI with condition editor
- [ ] Real-time event triggers (database triggers)
- [ ] Schedule runner (cron job or Inngest integration)
- [ ] Template gallery with one-click deploy

**Implementation Details:** See `docs/FEAT-023-AUTOMATION-AGENT-SPEC.md`

---

### FEAT-024: Business Glossary Management
**Status:** Completed
**GitHub Issue:** [#10](https://github.com/martinzahumensky-bigz/amygdala/issues/10)
**Original Prompt:** "we have added functionality of business terms on catalog, can we now finish missing screen for glossary, please research competitors like atlan and collibra before you start and design similar or better solution"

**Research Summary (Atlan & Collibra):**
- Hierarchical terms and categories (domains)
- Term metadata: definitions, synonyms, abbreviations, examples
- Term lifecycle: Draft → Approved → Deprecated
- Linked assets showing where terms are used
- Related terms for semantic connections
- Ownership and stewardship assignment
- Search and filter by domain/status

**Key Components:**
- [x] Database schema: `glossary_terms`, `glossary_domains`, `glossary_term_links`
- [x] API routes: GET/POST /api/glossary, GET/PATCH/DELETE /api/glossary/[termId], GET/POST /api/glossary/domains
- [x] Glossary list page with grid/list views
- [x] Search by name, definition, abbreviation
- [x] Filter by domain and status
- [x] Term detail panel with linked assets
- [x] Create/edit term modal
- [x] Term approval workflow
- [x] Pre-seeded domains (Finance, Customer, Product, Operations, Marketing, Sales, HR, Technology)
- [x] Pre-seeded example terms (ARR, MRR, Churn, CAC, LTV, NPS, etc.)

---

## Completed Features

| ID | Title | Date |
|----|-------|------|
| FEAT-001 | Project Foundation | 2026-01-23 |
| FEAT-002 | Platform Dashboard Layout | 2026-01-26 |
| FEAT-003 | Agent Command Center | 2026-01-26 |
| FEAT-004 | Spotter Agent Implementation | 2026-01-26 |
| FEAT-005 | Issues Management | 2026-01-27 |
| FEAT-006 | Catalog Browser | 2026-01-27 |
| FEAT-007 | Meridian Bank Data Generation | 2026-01-23 |
| FEAT-008 | Meridian Bank Reports | 2026-01-23 |
| FEAT-009 | Platform Enhancement (7 Phases) | 2026-01-27 |
| FEAT-010 | Data Trust Index + Trust Agent | 2026-01-27 |
| FEAT-011 | Home Dashboard Widgets | 2026-01-27 |
| FEAT-016 | Orchestrator Agent Chat Interface | 2026-01-27 |
| FEAT-017 | Enhanced Catalog + Quality Agent | 2026-01-28 |
| FEAT-020 | Data Structure Tab & Asset Editing | 2026-01-29 |
| FEAT-021 | Data Products - Asset Grouping | 2026-01-29 |
| FEAT-022 | Enhanced Trust Index Visualization | 2026-01-30 |
| FEAT-024 | Business Glossary Management | 2026-01-31 |

### Agent Implementation Summary

| Agent | Status | Primary Feature |
|-------|--------|-----------------|
| Spotter | ✅ Complete | FEAT-004 |
| Documentarist | ✅ Complete | FEAT-009 |
| Debugger | ✅ Complete | FEAT-009 |
| Operator | ✅ Complete | FEAT-009 |
| Quality | ✅ Complete | FEAT-017 |
| Trust | ✅ Complete | FEAT-010 |
| Orchestrator | ✅ Complete | FEAT-016 |
| **Transformation** | ✅ Complete | FEAT-019 |
