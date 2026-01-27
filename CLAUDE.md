# Amygdala - Claude Code Instructions

**Domain:** amygdala.vercel.app | **Tagline:** "Trust your data through autonomous AI agents"

---

## CRITICAL: GitHub Issues & Roadmap (ALWAYS FOLLOW)

**Every feature or bug fix MUST have BOTH a GitHub Issue AND a ROADMAP.md entry.**

### Before Starting ANY Work

1. **Create GitHub Issue FIRST:**
```bash
gh issue create --title "FEAT-XXX: Title" --body "$(cat <<'EOF'
## Description
[Brief description]

## Original Request
[User's exact prompt]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
EOF
)"
```

2. **Add labels:**
```bash
gh issue edit <number> --add-label "enhancement"  # or "bug"
gh issue edit <number> --add-label "priority:high"  # if urgent
```

3. **Update ROADMAP.md** with short entry:
```markdown
#### FEAT-XXX: Title
**GitHub Issue:** #XX
**Status:** In Progress
**Original Prompt:** "[User's request]"
```

### After Completing Work

1. **Close the GitHub Issue:**
```bash
gh issue close <number> --comment "Completed. Summary: [what was done]"
```

2. **Update ROADMAP.md** status to `Completed`

### Why This Matters

- GitHub Issues provide public visibility and tracking
- ROADMAP.md coordinates multiple developers
- Missing either breaks the workflow

---

## Response Format (ALWAYS END WITH THIS)

After completing ANY task:

```
---
**Original Request:** [Repeat user's prompt]

**Summary:**
- [Action 1]
- [Action 2]
- [Files modified]
```

---

## Quick Reference

### Project Structure

| App | Port | Purpose |
|-----|------|---------|
| platform | 3002 | Amygdala Data Trust Platform |
| meridian | 3003 | Meridian Bank (simulation) |

### Supabase
- **Project:** `xfcqszmaoxiilzudvguy`
- **URL:** https://xfcqszmaoxiilzudvguy.supabase.co
- **Schemas:** `amygdala` (core), `meridian` (bank simulation)

### Key Commands
```bash
# Development
pnpm dev                    # Start both apps
pnpm dev:platform           # Platform only (port 3002)
pnpm dev:meridian           # Meridian only (port 3003)

# Database
supabase db push            # Push migrations
supabase db pull            # Pull remote schema
supabase gen types typescript --local > packages/database/src/types.generated.ts

# Build & Deploy
pnpm build                  # Build all apps
git push origin main        # Auto-deploys to Vercel
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 + React 19 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Anthropic Claude API |
| Background Jobs | Inngest (planned) |
| Styling | Tailwind CSS |
| UI Components | Radix UI + custom |
| Deployment | Vercel |
| Package Manager | pnpm |
| Monorepo | Turborepo |

---

## Database Schemas

### Amygdala Schema
| Table | Purpose |
|-------|---------|
| `amygdala.assets` | Data asset catalog |
| `amygdala.issues` | Issue tracking |
| `amygdala.agent_logs` | Agent activity logs |
| `amygdala.agent_runs` | Agent run history |
| `amygdala.snapshots` | Historical snapshots |

### Meridian Schema
| Table | Purpose |
|-------|---------|
| `meridian.ref_branches` | Branch reference data |
| `meridian.silver_transactions` | Cleaned transactions |
| `meridian.gold_daily_revenue` | Aggregated revenue |
| `meridian.gold_branch_metrics` | Branch performance |
| `meridian.pipelines` | Pipeline definitions |
| `meridian.pipeline_runs` | Pipeline run history |

---

## Agents

| Agent | Purpose | Priority |
|-------|---------|----------|
| Spotter | Detects anomalies in reports | HIGH - MVP |
| Debugger | Investigates issues, finds root cause | HIGH - MVP |
| Quality Agent | Generates quality rules | MEDIUM |
| Trust Agent | Calculates trust scores | MEDIUM |
| Documentarist | Catalogs assets | LOW |
| Transformation Agent | Transforms/repairs data | LOW |

---

## Coding Standards

### Must Follow
- **Mobile-first** - Design for mobile, scale up
- **Dark mode ready** - Use Tailwind `dark:` classes
- **Type-safe** - Use TypeScript strictly
- **Shared components** - Use `@amygdala/ui` package

### File Naming
- Components: `PascalCase.tsx`
- Pages: `lowercase-with-hyphens/page.tsx`
- Lib files: `camelCase.ts`
- Types: `PascalCase` interfaces

### Import Aliases
```typescript
// Platform app
import { Button } from '@amygdala/ui';
import { Asset } from '@amygdala/database';
import { createClient } from '@/lib/supabase/client';

// Meridian app
import { Card } from '@amygdala/ui';
import { MeridianTransaction } from '@amygdala/database';
```

---

## Agent Development Pattern

```typescript
// lib/agents/[agent-name].ts
import { BaseAgent, AgentContext, AgentRunResult } from './base';

export class SpotterAgent extends BaseAgent {
  constructor() {
    super('Spotter', 'Detects anomalies that would make users distrust data');
  }

  get systemPrompt(): string {
    return `You are the Spotter agent...`;
  }

  async run(context?: AgentContext): Promise<AgentRunResult> {
    this.setStatus('running');
    // Implementation
    return { success: true, stats: { anomalies_detected: 0 } };
  }
}
```

---

## UI Theme (Ataccama-Inspired)

### Colors
```typescript
// Primary: Purple
primary: { 600: '#9333ea', 700: '#7c3aed' }

// Accent: Pink
accent: { 500: '#ec4899', 600: '#db2777' }

// Agent Colors
agent: {
  documentarist: '#8b5cf6',  // Purple
  spotter: '#06b6d4',        // Cyan
  debugger: '#f97316',       // Orange
  quality: '#22c55e',        // Green
  transformation: '#ec4899', // Pink
  trust: '#eab308',          // Yellow
}

// RAG Status
rag: { green: '#10b981', amber: '#f59e0b', red: '#ef4444' }
```

### Typography
- Font: Poppins (Platform), Inter (Meridian)
- Headings: `font-semibold` or `font-bold`
- Body: `text-sm` or `text-base`

---

## Development Workflow

### Feature Development
1. Create GitHub issue
2. Update ROADMAP.md
3. Create feature branch: `git checkout -b feat/FEAT-XXX-description`
4. Implement with tests
5. Push and create PR
6. Merge to main (auto-deploys)
7. Close issue, update ROADMAP

### Commit Messages
```bash
git commit -m "$(cat <<'EOF'
feat(agent): implement Spotter anomaly detection

- Add missing data detection
- Add value anomaly detection
- Add freshness checking

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Project Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview |
| `ORIGINAL_PROMPT.md` | Vision document |
| `AMYGDALA_SPECIFICATION.md` | Full technical spec |
| `MERIDIAN_BANK_SPECIFICATION.md` | Simulation environment |
| `PROJECT_STRUCTURE.md` | Monorepo architecture |
| `IMPLEMENTATION_ROADMAP.md` | Phase-by-phase plan |
| `ROADMAP.md` | Active work tracking |

---

## Claude Code Settings

### Permissions
- **Run CLI commands directly** - Don't ask for git, supabase, pnpm
- **Create files as needed** - Follow project structure
- **Always commit with co-author** - Include Claude attribution

### Never Ask For
- Running `pnpm install` or `pnpm dev`
- Git operations (add, commit, push)
- Supabase migrations

### Always Ask For
- Deploying to production
- Deleting data
- Major architecture changes

---

## CLI Tools (ALWAYS USE FIRST)

**IMPORTANT:** Always use CLI tools for Vercel and Supabase operations. Only escalate to the user if CLI cannot solve the issue.

### Vercel CLI
```bash
# Check deployments
vercel ls platform --scope amygdala

# Inspect specific deployment
vercel inspect <deployment-url> --scope amygdala

# Check deployment logs
vercel logs <deployment-url> --scope amygdala

# Trigger production deployment
vercel --prod --yes

# List projects
vercel project ls
```

### Supabase CLI
```bash
# Check database status
supabase status

# Run SQL queries
supabase db execute --sql "SELECT * FROM table LIMIT 10"

# Push migrations
supabase db push

# Pull remote schema
supabase db pull

# Generate types
supabase gen types typescript --local > packages/database/src/types.generated.ts
```

### Troubleshooting Workflow
1. **Deployment issues** → Use `vercel ls` and `vercel inspect` first
2. **Database issues** → Use `supabase` CLI to diagnose
3. **Only if CLI fails** → Ask user for help with dashboard access
