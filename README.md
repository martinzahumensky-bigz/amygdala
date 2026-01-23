# Amygdala

**Next-Generation Agentic Data Trust Platform**

Amygdala revolutionizes data trust by working **top-down** - starting from the reports and applications that business users actually see, then tracing backwards through data pipelines to ensure trustworthiness at every layer.

---

## The Problem

Traditional data quality tools work **bottom-up**:
- Document source tables
- Hope users find value in the catalog
- Miss the issues that make users say *"I don't trust this data"*

**Amygdala flips this:**
- Start at reports and consumer applications
- Detect anomalies that humans would spot
- Trace issues back to their root cause
- Build trust from the top down

---

## The Solution: 6 Autonomous Agents

| Agent | Role |
|-------|------|
| **Documentarist** | Catalogs assets by tracing from reports to sources |
| **Spotter** | Detects anomalies that would make users distrust data |
| **Debugger** | Investigates issues and finds root causes |
| **Quality Agent** | Generates and enforces contextual quality rules |
| **Transformation Agent** | Repairs data and creates derived assets |
| **Trust Agent** | Calculates holistic trust scores |

---

## Project Structure

```
amygdala/
├── apps/
│   ├── platform/        # Amygdala Platform (main app)
│   └── meridian/        # Meridian Bank (simulation environment)
├── packages/
│   ├── ui/              # Shared UI components
│   └── database/        # Shared types and queries
├── supabase/
│   └── migrations/      # Database schema
└── docs/                # Documentation
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 + React 19 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Claude API (Anthropic) |
| Background Jobs | Inngest |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Original Prompt](./ORIGINAL_PROMPT.md) | The vision that inspired Amygdala |
| [Specification](./AMYGDALA_SPECIFICATION.md) | Full technical specification |
| [Meridian Bank](./MERIDIAN_BANK_SPECIFICATION.md) | Simulated bank for demos |
| [Project Structure](./PROJECT_STRUCTURE.md) | Monorepo architecture |
| [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md) | Phase-by-phase plan |
| [Implementation Guide](./AMYGDALA_IMPLEMENTATION_GUIDE.md) | Code templates (legacy) |

---

## Quick Start

```bash
# Clone and install
git clone <repo>
cd amygdala
pnpm install

# Setup Supabase
supabase start
supabase db push

# Generate types
pnpm db:types

# Start development
pnpm dev
```

**Platform**: http://localhost:3000
**Meridian Bank**: http://localhost:3001

---

## Demo Scenarios

### Scenario 1: Missing Data Detection
1. Pipeline fails, no data for yesterday
2. Spotter detects gap in revenue report
3. Creates critical issue
4. Debugger investigates, restarts pipeline
5. Data flows, issue resolved

### Scenario 2: Quality Issues
1. 15% of phone numbers have invalid format
2. Quality Agent detects pattern failures
3. Creates medium-severity issue
4. Transformation Agent offers to normalize

### Scenario 3: Reference Data Gap
1. New branch appears in transactions
2. Not found in reference table
3. Spotter sees "UNKNOWN" in report
4. Debugger identifies gap, adds reference

---

## Meridian Bank

A fictional regional bank that serves as the demonstration environment:

- **Reports**: Daily Revenue, Branch Performance, Loan Portfolio
- **Applications**: Customer 360, Call Center Console
- **Data Layers**: Landing → Bronze → Silver → Gold
- **Issues**: Controlled injection of quality problems

---

## Implementation Status

### Quick Prototype (Target: 2-3 weeks)
- [ ] Monorepo setup
- [ ] Database schema
- [ ] Meridian Bank data + reports
- [ ] Spotter agent
- [ ] Debugger agent
- [ ] Agent Command Center
- [ ] Issues management
- [ ] Catalog browser

### Full MVP (Target: 8 weeks)
- [ ] All 6 agents operational
- [ ] Agent orchestration
- [ ] Full demo scenarios
- [ ] Production deployment

---

## Contributing

This is an internal Ataccama innovation project exploring the future of agentic data trust.

---

## License

Proprietary - Ataccama Corporation

---

*Built with Claude by Anthropic*
