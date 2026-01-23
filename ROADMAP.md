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
**Status:** Open
**GitHub Issue:** TBD

- [ ] Sidebar navigation component
- [ ] Header with user menu
- [ ] Dashboard shell/layout
- [ ] Responsive design
- [ ] Dark mode support

---

### FEAT-003: Agent Command Center
**Status:** Open
**GitHub Issue:** TBD

- [ ] Agent cards with status indicators
- [ ] "Run Now" functionality
- [ ] Activity feed
- [ ] Agent statistics display

---

### FEAT-004: Spotter Agent Implementation
**Status:** Open
**GitHub Issue:** TBD

- [ ] Base agent framework
- [ ] Missing data detection
- [ ] Value anomaly detection (z-score)
- [ ] Freshness checking
- [ ] Issue creation
- [ ] Activity logging

---

### FEAT-005: Issues Management
**Status:** Open
**GitHub Issue:** TBD

- [ ] Issues list page
- [ ] Issue detail view
- [ ] Status workflow (open → investigating → resolved)
- [ ] Assignment functionality

---

### FEAT-006: Catalog Browser
**Status:** Open
**GitHub Issue:** TBD

- [ ] Asset list with filters
- [ ] Asset detail page
- [ ] Trust indicators (stars, RAG)
- [ ] Agent logs per asset

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

### FEAT-009: Debugger Agent Implementation
**Status:** Open
**GitHub Issue:** TBD

- [ ] Issue monitoring
- [ ] Lineage tracing
- [ ] Root cause analysis
- [ ] Auto-remediation (simple cases)

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
| FEAT-007 | Meridian Bank Data Generation | 2026-01-23 |
| FEAT-008 | Meridian Bank Reports | 2026-01-23 |
