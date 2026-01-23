# Amygdala - Project Structure

## Monorepo Architecture

Following the patterns from seekwhy, we'll use a monorepo with two Next.js applications sharing common packages.

```
amygdala/
├── apps/
│   ├── platform/                    # Amygdala Platform (main app)
│   │   ├── app/
│   │   │   ├── (auth)/              # Auth routes (login, signup)
│   │   │   ├── (dashboard)/         # Protected dashboard routes
│   │   │   │   ├── agents/          # Agent management
│   │   │   │   ├── catalog/         # Asset catalog
│   │   │   │   ├── issues/          # Issue tracking
│   │   │   │   └── settings/        # Platform settings
│   │   │   ├── api/                 # API routes
│   │   │   │   ├── agents/          # Agent endpoints
│   │   │   │   ├── assets/          # Asset CRUD
│   │   │   │   ├── issues/          # Issue management
│   │   │   │   ├── quality/         # Quality rules
│   │   │   │   └── webhooks/        # Inngest, etc.
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── agents/              # Agent cards, chat, status
│   │   │   ├── catalog/             # Asset list, detail, trust indicators
│   │   │   ├── issues/              # Issue list, detail
│   │   │   ├── layout/              # Sidebar, header, shell
│   │   │   └── ui/                  # Shared UI primitives
│   │   ├── lib/
│   │   │   ├── agents/              # Agent implementations
│   │   │   │   ├── base.ts
│   │   │   │   ├── documentarist.ts
│   │   │   │   ├── spotter.ts
│   │   │   │   ├── debugger.ts
│   │   │   │   ├── quality.ts
│   │   │   │   ├── transformation.ts
│   │   │   │   └── trust.ts
│   │   │   ├── ai/                  # Claude API integration
│   │   │   ├── data/                # Data access layer
│   │   │   ├── supabase/            # Supabase clients
│   │   │   └── inngest/             # Background jobs
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tailwind.config.ts
│   │
│   └── meridian/                    # Meridian Bank (simulation app)
│       ├── app/
│       │   ├── (public)/            # Public report views
│       │   │   ├── reports/
│       │   │   │   ├── revenue/
│       │   │   │   ├── branch-performance/
│       │   │   │   ├── loan-portfolio/
│       │   │   │   └── risk-exposure/
│       │   │   └── crm/
│       │   │       ├── customer-360/
│       │   │       └── call-center/
│       │   ├── (admin)/             # Admin for simulation control
│       │   │   ├── data-generator/
│       │   │   ├── issue-injector/
│       │   │   └── pipeline-status/
│       │   ├── api/
│       │   │   ├── simulate/        # Simulation endpoints
│       │   │   ├── reports/         # Report data endpoints
│       │   │   └── data/            # Data access for Amygdala
│       │   └── page.tsx
│       ├── components/
│       │   ├── reports/             # Report components
│       │   ├── crm/                 # CRM components
│       │   └── admin/               # Admin components
│       ├── lib/
│       │   ├── data/                # Data access
│       │   ├── simulation/          # Simulation logic
│       │   │   ├── data-generator.ts
│       │   │   ├── issue-injector.ts
│       │   │   └── pipeline-simulator.ts
│       │   └── supabase/
│       ├── next.config.ts
│       ├── package.json
│       └── tailwind.config.ts
│
├── packages/
│   ├── ui/                          # Shared UI components
│   │   ├── src/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── database/                    # Shared database types & queries
│   │   ├── src/
│   │   │   ├── types.ts             # Generated Supabase types
│   │   │   ├── schema.sql           # Full schema
│   │   │   └── queries/             # Shared queries
│   │   └── package.json
│   │
│   └── config/                      # Shared config
│       ├── tailwind/
│       ├── eslint/
│       └── typescript/
│
├── supabase/
│   ├── migrations/                  # Database migrations
│   │   ├── 00001_initial_schema.sql
│   │   ├── 00002_amygdala_core.sql
│   │   ├── 00003_meridian_bank.sql
│   │   └── ...
│   ├── functions/                   # Edge functions
│   └── config.toml
│
├── scripts/
│   ├── setup.sh                     # Initial setup
│   ├── generate-types.sh            # Generate Supabase types
│   └── seed-data.ts                 # Seed initial data
│
├── docs/
│   ├── ORIGINAL_PROMPT.md           # Vision document
│   ├── AMYGDALA_SPECIFICATION.md    # Full spec
│   ├── MERIDIAN_BANK_SPECIFICATION.md
│   └── IMPLEMENTATION_ROADMAP.md
│
├── .env.example
├── .gitignore
├── package.json                     # Monorepo root
├── turbo.json                       # Turborepo config
├── vercel.json                      # Vercel deployment
└── README.md
```

---

## Technology Decisions

### Core Stack (Matching seekwhy)
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 15 | App Router, Server Components, API Routes |
| React | React 19 | Latest features, Suspense |
| Database | Supabase (PostgreSQL) | Auth + DB + Realtime + Functions |
| Styling | Tailwind CSS v4 | Utility-first, fast development |
| Deployment | Vercel | Seamless Next.js integration |
| Background Jobs | Inngest | Event-driven, serverless workflows |
| AI | Claude API (Anthropic) | Agent intelligence |
| Validation | Zod | Runtime type checking |
| Icons | Lucide React | Clean, consistent iconography |

### UI Design (Matching Ataccama)
| Element | Implementation |
|---------|---------------|
| Colors | Purple (#6A2CF5) / Pink (#F10090) accents on neutral base |
| Font | Poppins (Google Fonts) |
| Cards | 16-24px border-radius, subtle shadows |
| Layout | Sidebar navigation, content area |
| Indicators | RAG (Red/Amber/Green) badges, Star ratings |

### Monorepo Tooling
| Tool | Purpose |
|------|---------|
| Turborepo | Build orchestration, caching |
| pnpm | Fast, efficient package management |
| TypeScript | Full type safety across packages |

---

## Database Schema Overview

### Amygdala Core Tables (in `amygdala` schema)

```sql
-- Assets catalog
amygdala.assets
amygdala.asset_profiles
amygdala.asset_lineage

-- Quality management
amygdala.quality_rules
amygdala.quality_results
amygdala.quality_scores

-- Issues
amygdala.issues
amygdala.issue_activities

-- Agents
amygdala.agent_runs
amygdala.agent_logs

-- Trust
amygdala.trust_scores
amygdala.trust_factors

-- Snapshots
amygdala.snapshots
```

### Meridian Bank Tables (in `meridian` schema)

```sql
-- Reference data
meridian.ref_branches
meridian.ref_products
meridian.ref_customer_segments

-- Landing zone
meridian.landing_transactions
meridian.landing_customers

-- Bronze layer
meridian.bronze_transactions
meridian.bronze_customers
meridian.bronze_loans
meridian.bronze_accounts

-- Silver layer
meridian.silver_transactions
meridian.silver_customers
meridian.silver_loans
meridian.silver_accounts

-- Gold layer
meridian.gold_daily_revenue
meridian.gold_branch_metrics
meridian.gold_loan_summary
meridian.gold_customer_360

-- Pipeline management
meridian.pipelines
meridian.pipeline_runs
```

---

## Package Dependencies

### Root `package.json`
```json
{
  "name": "amygdala",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "db:migrate": "supabase db push",
    "db:types": "supabase gen types typescript --local > packages/database/src/types.ts"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### Platform App Dependencies
```json
{
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "anthropic": "^0.35.0",
    "inngest": "^3.0.0",
    "zod": "^3.23.0",
    "lucide-react": "^0.400.0",
    "recharts": "^2.12.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  }
}
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Site URLs
NEXT_PUBLIC_PLATFORM_URL=http://localhost:3000
NEXT_PUBLIC_MERIDIAN_URL=http://localhost:3001

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

---

## Vercel Deployment

### `vercel.json`
```json
{
  "buildCommand": "turbo build",
  "outputDirectory": "apps/platform/.next",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/agents/scheduled",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Deployment URLs
- **Platform**: `amygdala.vercel.app` (or custom domain)
- **Meridian**: `meridian-bank.vercel.app` (or subdomain of same)

---

## Development Workflow

### Initial Setup
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

### Running Specific Apps
```bash
# Platform only
pnpm --filter platform dev

# Meridian only
pnpm --filter meridian dev

# Both
pnpm dev
```

---

## File Naming Conventions

Following seekwhy patterns:
- **Components**: PascalCase (`AgentCard.tsx`)
- **Pages**: lowercase with hyphens (`daily-revenue/page.tsx`)
- **Lib files**: camelCase (`dataGenerator.ts`)
- **Types**: PascalCase interfaces (`Asset`, `Issue`)
- **Constants**: SCREAMING_SNAKE_CASE (`AGENT_COLORS`)

---

*This structure allows gradual implementation while maintaining clear separation between the Amygdala platform and the Meridian Bank simulation environment.*
