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
**Status:** In Progress
**Original Prompt:** "Improve cataloging pages with comprehensive tabs for overview, profiling, quality, preview, lineage, and transformations"

**Overview Tab (Documentarist)**
- [ ] Dataset metadata (name, type, layer, source system)
- [ ] Business description and context
- [ ] Sensitive data indicators
- [ ] Business terms/glossary mapping
- [ ] Data usage information

**Profiling Tab**
- [ ] Column-level statistics (null %, distinct, min/max/mean)
- [ ] Data format patterns and masks
- [ ] AI-interpreted anomaly highlights
- [ ] Semantic type detection

**Quality Tab**
- [ ] Overall quality score with breakdown
- [ ] Applied quality rules list
- [ ] Attribute-level quality indicators

**Preview Tab**
- [ ] Paginated sample data table
- [ ] Column type indicators
- [ ] NULL value highlighting

**Lineage Tab**
- [ ] Visual lineage diagram
- [ ] AI-explained data flow
- [ ] Pipeline/transformation details

**Transformations Tab**
- [ ] Agent-generated improvements
- [ ] Transformation history

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

### FEAT-010: Quality Agent
**Status:** Planned

### FEAT-011: Trust Agent
**Status:** Planned

### FEAT-012: Documentarist Agent
**Status:** Planned

### FEAT-013: Transformation Agent
**Status:** Planned

### FEAT-014: Agent Orchestration
**Status:** Planned

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
| FEAT-010 | Data Trust Index | 2026-01-27 |
| FEAT-011 | Home Dashboard Widgets | 2026-01-27 |
| FEAT-016 | Orchestrator Agent Chat Interface | 2026-01-27 |
