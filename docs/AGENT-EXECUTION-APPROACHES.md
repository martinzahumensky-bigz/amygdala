# Agent Execution Approaches

> Technical comparison of E2B, Modal Labs, and LangGraph for self-improving AI agents

---

## The Core Pattern: Agentic Coding Loop

AI agents that can write, execute, evaluate, and iterate on code follow this pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTIC CODING LOOP                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │ Generate │───▶│ Execute  │───▶│ Evaluate │             │
│   │   Code   │    │ Sandbox  │    │ Results  │             │
│   └──────────┘    └──────────┘    └────┬─────┘             │
│        ▲                               │                    │
│        │         ┌──────────┐          │                    │
│        └─────────│  Iterate │◀─────────┘                    │
│                  │ (if needed)                              │
│                  └──────────┘                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

The three approaches solve different parts of this problem:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌─────────────┐                                          │
│   │  LANGGRAPH  │  ← Controls the "thinking" loop          │
│   │ (The Brain) │    Decides when to retry, what to fix    │
│   └──────┬──────┘                                          │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────────────────────────────────┐              │
│   │         WHERE CODE RUNS                  │              │
│   │                                          │              │
│   │   ┌─────────┐         ┌─────────┐       │              │
│   │   │   E2B   │   OR    │  MODAL  │       │              │
│   │   │ (Quick) │         │ (Heavy) │       │              │
│   │   └─────────┘         └─────────┘       │              │
│   │                                          │              │
│   └─────────────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Approach 1: E2B (The "Safe Room")

### What It Is
E2B is a service that creates isolated, temporary computers in the cloud. Your AI generates code, E2B runs it in a "safe room" that can't touch your real data or systems.

### How It Works

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  YOUR SYSTEM                         E2B SANDBOX         │
│  ──────────                         ────────────         │
│                                                          │
│  ┌──────────┐      "Run this       ┌──────────────┐     │
│  │    AI    │      code please"    │  Temporary   │     │
│  │  Agent   │  ──────────────────▶ │   Computer   │     │
│  └──────────┘                      │              │     │
│                                    │  - Isolated  │     │
│       ▲           Results          │  - No access │     │
│       │       ◀──────────────────  │    to your   │     │
│       │                            │    systems   │     │
│       │                            └──────────────┘     │
│       │                                   │             │
│       │                                   ▼             │
│  Evaluate                          ┌──────────────┐     │
│  & Iterate                         │  Destroyed   │     │
│                                    │  after use   │     │
│                                    └──────────────┘     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Analogy
Like a **test kitchen** in a restaurant. Chefs (AI) can experiment with new recipes (code) without affecting the main kitchen. If something goes wrong (bad code), you just clean up the test kitchen - the restaurant keeps running.

### Pros and Cons

| Pros | Cons |
|------|------|
| Very secure - can't harm your systems | Limited to short tasks (minutes) |
| Purpose-built for AI agents | Can be expensive at high volume |
| Fast to spin up (seconds) | Data must be copied in each time |
| Easy to implement | Less powerful than full servers |

### Best For
- Quick data transformations
- Testing matching logic on samples
- Situations where security is paramount
- Prototyping and iteration

### Cost
~$0.10-0.50 per sandbox session (a few minutes of compute)

### Implementation Example

```typescript
// lib/sandbox/e2b-executor.ts
import { Sandbox } from '@e2b/code-interpreter';

export async function executeDataMatchingCode(
  code: string,
  datasets: { a: any[]; b: any[] }
): Promise<ExecutionResult> {
  const sandbox = await Sandbox.create();

  try {
    // Upload data
    await sandbox.filesystem.write('/data/dataset_a.json', JSON.stringify(datasets.a));
    await sandbox.filesystem.write('/data/dataset_b.json', JSON.stringify(datasets.b));

    // Execute matching code
    const result = await sandbox.runCode(code);

    return {
      success: !result.error,
      output: result.results,
      logs: result.logs,
      error: result.error
    };
  } finally {
    await sandbox.close();
  }
}
```

---

## Approach 2: Modal Labs (The "Heavy Machinery")

### What It Is
Modal is cloud computing that spins up powerful machines on-demand. You only pay when code is actually running. Think of it as renting industrial equipment by the minute.

### How It Works

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  YOUR SYSTEM                         MODAL CLOUD         │
│  ──────────                         ────────────         │
│                                                          │
│  ┌──────────┐      "Process this   ┌──────────────┐     │
│  │    AI    │      10GB dataset"   │   Powerful   │     │
│  │  Agent   │  ──────────────────▶ │   Machine    │     │
│  └──────────┘                      │              │     │
│                                    │  - 32 CPUs   │     │
│       ▲           Results          │  - 128GB RAM │     │
│       │       ◀──────────────────  │  - GPUs      │     │
│       │                            │    available │     │
│       │                            └──────────────┘     │
│       │                                   │             │
│       │                                   ▼             │
│  Evaluate                          ┌──────────────┐     │
│  & Iterate                         │ Shuts down   │     │
│                                    │ when idle    │     │
│                                    └──────────────┘     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Analogy
Like **renting a factory** for an hour. Need to process a million records? Spin up 10 machines, crunch through it in minutes, shut them down. You only pay for those minutes of usage.

### Pros and Cons

| Pros | Cons |
|------|------|
| Very powerful (GPUs, lots of RAM) | More complex to set up |
| Can handle massive datasets | Requires Python knowledge |
| Cost-effective for heavy work | Overkill for small tasks |
| Scales automatically | Cold starts (few seconds delay) |

### Best For
- Processing millions of records
- Machine learning model training
- Complex data matching at scale
- Production workloads

### Cost
~$0.001-0.01 per second of compute (varies by machine size)

### Implementation Example

```python
# modal_functions/data_mastering.py
import modal

app = modal.App("amygdala-data-mastering")

@app.function(
    image=modal.Image.debian_slim().pip_install("pandas", "recordlinkage", "fuzzywuzzy"),
    timeout=300
)
def execute_matching_code(code: str, data_a: list, data_b: list) -> dict:
    import pandas as pd

    # Create execution context
    local_vars = {
        'pd': pd,
        'df_a': pd.DataFrame(data_a),
        'df_b': pd.DataFrame(data_b),
        'results': None
    }

    # Execute the generated code
    exec(code, {}, local_vars)

    return {
        'matched_pairs': local_vars.get('results', {}).get('matches', []),
        'confidence_scores': local_vars.get('results', {}).get('scores', []),
        'stats': local_vars.get('results', {}).get('stats', {})
    }
```

---

## Approach 3: LangGraph (The "Brain")

### What It Is
LangGraph is not where code runs - it's the **orchestration layer** that controls how your AI agent thinks, iterates, and makes decisions. It's the "brain" that decides when to retry and what to change.

### How It Works

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                      LANGGRAPH                           │
│              (The Decision-Making Loop)                  │
│                                                          │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐            │
│   │  START  │───▶│ Generate│───▶│ Execute │            │
│   │         │    │  Code   │    │  Code   │            │
│   └─────────┘    └─────────┘    └────┬────┘            │
│                                      │                  │
│                                      ▼                  │
│                               ┌─────────────┐          │
│                               │  Evaluate   │          │
│                               │  Results    │          │
│                               └──────┬──────┘          │
│                                      │                  │
│                         ┌────────────┴────────────┐    │
│                         │                         │    │
│                         ▼                         ▼    │
│                   ┌──────────┐             ┌──────────┐│
│                   │ Not Good │             │   Good   ││
│                   │  Enough  │             │  Enough  ││
│                   └────┬─────┘             └────┬─────┘│
│                        │                        │      │
│                        ▼                        ▼      │
│                   ┌──────────┐             ┌──────────┐│
│                   │  Loop    │             │   DONE   ││
│                   │  Back    │             │  Save it ││
│                   └──────────┘             └──────────┘│
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Analogy
Like a **project manager** who oversees the work. They don't do the actual work (running code) - they decide what needs to be done, check if it's good enough, and assign the next task if not.

### Pros and Cons

| Pros | Cons |
|------|------|
| Handles complex decision logic | Doesn't run code itself |
| Tracks state across iterations | Requires E2B or Modal for execution |
| Built-in retry and error handling | Learning curve |
| Industry standard for AI agents | Additional layer of complexity |

### Best For
- Complex multi-step workflows
- Situations with many decision points
- When you need detailed logging of "why" decisions were made
- Production-grade agent systems

### Cost
Free (open source) - but you still pay for the LLM calls it makes

### Implementation Example

```typescript
// Using LangGraph for the iteration state machine
import { StateGraph, END } from "@langchain/langgraph";

const workflow = new StateGraph({
  channels: {
    code: null,
    results: null,
    iteration: 0,
    satisfactory: false
  }
});

workflow
  .addNode("generate", generateCodeNode)
  .addNode("execute", executeCodeNode)
  .addNode("evaluate", evaluateResultsNode)
  .addEdge("generate", "execute")
  .addEdge("execute", "evaluate")
  .addConditionalEdges("evaluate", (state) => {
    if (state.satisfactory || state.iteration >= 5) return END;
    return "generate"; // Loop back
  });
```

---

## Side-by-Side Comparison

| Dimension | E2B | Modal | LangGraph |
|-----------|-----|-------|-----------|
| **What it does** | Runs code safely | Runs code powerfully | Controls the iteration loop |
| **Analogy** | Test kitchen | Rented factory | Project manager |
| **Security** | ★★★★★ | ★★★☆☆ | N/A (doesn't run code) |
| **Power** | ★★☆☆☆ | ★★★★★ | N/A |
| **Ease of setup** | ★★★★★ | ★★★☆☆ | ★★★☆☆ |
| **Cost at low volume** | Medium | Low | Free |
| **Cost at high volume** | High | Low | Free |
| **Best for** | Prototyping, security | Production scale | Complex workflows |

---

## Which Should You Use?

### The Short Answer

**You likely need two of these working together:**

```
┌────────────────────────────────────────────────────┐
│                                                    │
│   RECOMMENDED COMBINATION                          │
│                                                    │
│   ┌────────────────────────────────────────────┐  │
│   │              LANGGRAPH                      │  │
│   │        (Controls the loop)                 │  │
│   └─────────────────┬──────────────────────────┘  │
│                     │                              │
│                     ▼                              │
│   ┌────────────────────────────────────────────┐  │
│   │                                            │  │
│   │   Small tasks          Large tasks         │  │
│   │   (< 10k rows)         (> 10k rows)        │  │
│   │        │                    │              │  │
│   │        ▼                    ▼              │  │
│   │   ┌────────┐          ┌────────┐          │  │
│   │   │  E2B   │          │ MODAL  │          │  │
│   │   └────────┘          └────────┘          │  │
│   │                                            │  │
│   └────────────────────────────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Decision Guide

| If you need... | Use... |
|----------------|--------|
| Quick prototype to prove concept | E2B alone |
| Simple iteration without complexity | E2B alone |
| Heavy data processing | Modal alone |
| Complex decision-making with retries | LangGraph + E2B |
| Production system at scale | LangGraph + Modal |
| Maximum security | LangGraph + E2B |
| Lowest cost at high volume | LangGraph + Modal |

---

## Data Mastering Agent Flow

For the specific use case of data mastering (matching records between datasets):

```
1. ANALYZE DATASETS
   ├── Infer schemas from both datasets
   ├── Identify potential key columns (names, IDs, dates)
   └── Detect data quality issues

2. GENERATE INITIAL MATCHING STRATEGY
   ├── Select blocking keys (to reduce comparison space)
   ├── Choose similarity functions per field
   │   ├── Exact match for IDs
   │   ├── Fuzzy match for names (Levenshtein, Jaro-Winkler)
   │   └── Proximity for dates/numbers
   └── Set initial thresholds

3. GENERATE CODE
   ```python
   # Auto-generated by Data Mastering Agent
   import recordlinkage

   indexer = recordlinkage.Index()
   indexer.block('last_name')  # Blocking key

   compare = recordlinkage.Compare()
   compare.string('first_name', 'first_name', method='jarowinkler', threshold=0.85)
   compare.exact('ssn_last4', 'ssn_last4')
   compare.numeric('account_balance', 'balance', scale=100)

   # ... rest of matching logic
   ```

4. EXECUTE ON SAMPLE
   └── Run on 1000-row sample from each dataset

5. EVALUATE
   ├── Check precision (false positive rate)
   ├── Check recall (missed matches)
   ├── Analyze edge cases
   └── Identify improvement areas

6. ITERATE (if needed)
   ├── Adjust thresholds
   ├── Add/remove blocking keys
   ├── Change similarity functions
   └── Re-run
```

---

## Implementation Pattern for Amygdala

```typescript
// lib/agents/data-mastering-agent.ts

export class DataMasteringAgent extends BaseAgent {
  private maxIterations = 5;

  async run(context: AgentContext): Promise<AgentRunResult> {
    const { datasetA, datasetB } = context;

    // Step 1: Analyze schemas
    const schemaAnalysis = await this.analyzeSchemas(datasetA, datasetB);

    // Step 2: Iterative code generation loop
    let iteration = 0;
    let currentCode = null;
    let results = null;
    let satisfactory = false;

    while (iteration < this.maxIterations && !satisfactory) {
      iteration++;

      // Generate or improve code
      currentCode = await this.generateMatchingCode({
        schemas: schemaAnalysis,
        previousCode: currentCode,
        previousResults: results,
        iteration
      });

      // Execute in sandbox (E2B or Modal)
      results = await this.executeInSandbox(currentCode, {
        sampleA: datasetA.sample(1000),
        sampleB: datasetB.sample(1000)
      });

      // Evaluate results
      const evaluation = await this.evaluateResults(results);
      satisfactory = evaluation.meetsThreshold;

      // Log iteration
      await this.logIteration({
        iteration,
        code: currentCode,
        results,
        evaluation
      });
    }

    // Commit final code
    if (satisfactory) {
      await this.commitMatchingLogic(currentCode);
    }

    return { success: satisfactory, iterations: iteration };
  }
}
```

---

## Key Considerations

### Security
- **Never execute user-provided code directly** - only agent-generated code
- **Use read-only data access** in sandboxes
- **Timeout limits** (30-60 seconds per execution)
- **Memory limits** to prevent runaway processes

### Cost Control
- **Sample data first** - don't run on full datasets during iteration
- **Limit iterations** (5 max is reasonable)
- **Cache intermediate results**

### Observability
- **Log every iteration** with code + results
- **Store execution traces** for debugging
- **Track token usage** per agent run

---

## Recommendation for Amygdala

### Phase 1: Start Simple (E2B only)
- Get the concept working
- Prove value to customers
- Learn what edge cases arise

### Phase 2: Add Orchestration (LangGraph + E2B)
- Better iteration logic
- Detailed logging for compliance
- Handle complex multi-step matching

### Phase 3: Scale Up (LangGraph + Modal)
- When customers have large datasets
- When you need to process millions of records
- Keep E2B for small tasks, Modal for big ones

---

## Related Documentation

- [Self-Improving Agents Business Perspective](./SELF-IMPROVING-AGENTS-BUSINESS.md) - Business value and risks
- [Data Mastering Agent Spec](./FEAT-015-MASTERING-AGENT-SPEC.md) - Specific implementation details
- [Agent-Driven Data Processing](./AGENT-DRIVEN-DATA-PROCESSING.md) - General agent architecture
