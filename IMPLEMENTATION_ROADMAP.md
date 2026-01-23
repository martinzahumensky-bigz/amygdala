# Amygdala - Implementation Roadmap

## Quick Prototype Strategy

The goal is to demonstrate the core concept with working agents in 2-4 weeks, then iterate to full MVP.

---

## Phase 0: Foundation (Days 1-2)

### Goals
- Monorepo setup with both apps
- Supabase project created
- Basic UI shell matching Ataccama style
- Database schema deployed

### Tasks

#### Day 1: Project Setup
- [ ] Create monorepo structure with Turborepo
- [ ] Initialize `apps/platform` (Next.js 15)
- [ ] Initialize `apps/meridian` (Next.js 15)
- [ ] Setup shared `packages/ui` with Tailwind
- [ ] Configure Ataccama-style theme (colors, fonts)
- [ ] Connect Supabase project
- [ ] Setup environment variables

#### Day 2: Core Schema
- [ ] Create Amygdala core tables (assets, issues, agent_logs)
- [ ] Create Meridian Bank tables (all layers)
- [ ] Generate TypeScript types
- [ ] Setup Supabase auth (basic)
- [ ] Create layout components (Sidebar, Header)

### Deliverables
- Both apps running locally
- Database schema deployed
- Basic navigation working
- Ataccama-style UI shell

---

## Phase 1: Meridian Bank Data (Days 3-5)

### Goals
- Generate realistic bank data
- Create basic reports that agents can "look at"
- Enable manual issue injection

### Tasks

#### Day 3: Data Generation
- [ ] Build customer data generator (5000 customers)
- [ ] Build transaction generator (6 months history)
- [ ] Build loan data generator
- [ ] Create reference data (branches, products)
- [ ] Seed database with initial data

#### Day 4: Reports
- [ ] Build Daily Revenue Report page
- [ ] Build Branch Performance page
- [ ] Create data access layer for reports
- [ ] Add report metadata (for Documentarist)

#### Day 5: CRM & Admin
- [ ] Build Customer 360 view
- [ ] Build admin panel for issue injection
- [ ] Create pipeline status dashboard
- [ ] Add data freshness indicators

### Deliverables
- Meridian Bank with realistic data
- 2-3 working reports
- Customer 360 screen
- Admin tools for demo control

---

## Phase 2: Spotter Agent (Days 6-8)

### Goals
- First working agent that detects anomalies
- Visible issue creation
- Agent activity logging

### Tasks

#### Day 6: Agent Framework
- [ ] Create base agent class
- [ ] Setup Claude API integration
- [ ] Create agent run logging
- [ ] Build agent status tracking

#### Day 7: Spotter Implementation
- [ ] Implement missing data detection
- [ ] Implement value anomaly detection (z-score)
- [ ] Implement freshness checking
- [ ] Create issue creation logic

#### Day 8: Agent UI
- [ ] Build Agent Command Center
- [ ] Create agent cards with status
- [ ] Add "Run Now" functionality
- [ ] Show recent activity feed

### Deliverables
- Spotter agent running and detecting issues
- Agent Command Center UI
- Issues created automatically
- Activity logging working

---

## Phase 3: Issues & Catalog (Days 9-11)

### Goals
- Complete issue management
- Basic catalog browser
- Trust indicators visible

### Tasks

#### Day 9: Issues System
- [ ] Build Issues list page
- [ ] Create Issue detail view
- [ ] Add issue status workflow
- [ ] Implement issue assignment

#### Day 10: Catalog Browser
- [ ] Build asset list with filters
- [ ] Create asset detail page
- [ ] Add trust indicators (stars, RAG)
- [ ] Show agent logs per asset

#### Day 11: Integration
- [ ] Link issues to assets
- [ ] Show affected assets on issues
- [ ] Create navigation between views
- [ ] Polish UI and fix bugs

### Deliverables
- Complete issue tracking
- Browsable catalog
- Trust indicators visible
- Linked navigation

---

## Phase 4: Debugger Agent (Days 12-14)

### Goals
- Second agent that investigates issues
- Lineage tracing
- Auto-remediation demo

### Tasks

#### Day 12: Debugger Core
- [ ] Implement issue monitoring
- [ ] Build lineage tracing logic
- [ ] Create pipeline status checking
- [ ] Implement root cause analysis

#### Day 13: Remediation
- [ ] Add "restart pipeline" capability
- [ ] Implement reference data gap detection
- [ ] Create auto-fix for simple cases
- [ ] Build escalation logic

#### Day 14: UI Integration
- [ ] Show Debugger activity on issues
- [ ] Display investigation progress
- [ ] Add resolution tracking
- [ ] Create agent chat interface (basic)

### Deliverables
- Debugger investigating Spotter issues
- Auto-remediation working
- Investigation visible in UI
- Agent collaboration demonstrated

---

## Phase 5: Demo Ready (Days 15-17)

### Goals
- Polish everything for demo
- Create demo scenarios
- Document demo playbook

### Tasks

#### Day 15: Demo Scenarios
- [ ] Script "Missing Data" scenario
- [ ] Script "Quality Issues" scenario
- [ ] Script "Reference Gap" scenario
- [ ] Create reset-to-clean function

#### Day 16: UI Polish
- [ ] Add loading states everywhere
- [ ] Improve error handling
- [ ] Add empty states
- [ ] Mobile responsiveness (basic)

#### Day 17: Documentation
- [ ] Write demo playbook
- [ ] Create README
- [ ] Record demo video (optional)
- [ ] Deploy to Vercel

### Deliverables
- Working demo with 2 agents
- 3 scripted scenarios
- Clean, polished UI
- Deployed to production

---

## Post-Prototype: Full MVP (Weeks 4-8)

### Week 4: Quality Agent
- Rule generation engine
- Validation execution
- Quality scoring
- Rule calibration

### Week 5: Trust Agent
- Trust score calculation
- Factor weighting
- Explanation generation
- Fitness assessment

### Week 6: Documentarist
- Report parsing
- Lineage tracing
- Profile generation
- Catalog enrichment

### Week 7: Transformation Agent
- Script generation
- Preview functionality
- Execution framework
- Chat interface

### Week 8: Integration & Polish
- Agent orchestration
- Full demo scenarios
- Performance optimization
- Production deployment

---

## Technical Milestones

### Prototype Complete (Day 17)
- [ ] 2 agents working (Spotter, Debugger)
- [ ] Meridian Bank with data
- [ ] Reports and CRM screens
- [ ] Issue tracking
- [ ] Catalog browser
- [ ] Agent Command Center

### MVP Complete (Week 8)
- [ ] All 6 agents operational
- [ ] Full simulation framework
- [ ] Complete UI
- [ ] Production deployment
- [ ] Demo playbook

---

## Risk Mitigation

### Risk: Claude API Rate Limits
**Mitigation**: Batch operations, cache responses, use smaller models for simple tasks

### Risk: Supabase Performance
**Mitigation**: Add indexes, optimize queries, use connection pooling

### Risk: Complex Agent Logic
**Mitigation**: Start simple, iterate based on what works in demos

### Risk: Scope Creep
**Mitigation**: Strict focus on demo scenarios, defer nice-to-haves

---

## Definition of Done

### For Prototype
- Spotter detects missing data and creates issue
- Debugger investigates and identifies root cause
- User can see issues in Issues screen
- User can browse assets in Catalog
- Agents visible in Command Center
- Can reset and re-run demo scenarios

### For MVP
- All 6 agents running on schedule
- Agent-to-agent triggers working
- Quality rules generating automatically
- Trust scores calculating correctly
- Full demo with all scenarios scripted

---

## Daily Standup Questions

1. What did I complete yesterday?
2. What am I working on today?
3. Any blockers?
4. Does this align with the prototype goal?

---

*Focus on demonstrable value first. A working Spotter + Debugger with realistic data is more impressive than 6 half-working agents.*
