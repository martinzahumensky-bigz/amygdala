import { inngest } from '../client';
import { createServerClient } from '@/lib/supabase/client';
import { executeInE2BSandbox } from '@/lib/e2b/sandbox';
import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_ACCURACY_THRESHOLD = 0.95;
const DEFAULT_MAX_ITERATIONS = 5;
const DEFAULT_SAMPLE_SIZE = 1000;

// Transformation types that don't need iteration
const SKIP_ITERATION_TYPES = ['null_remediation'];

/**
 * Inngest function for transformation iteration loop
 * This runs outside of Vercel's timeout limits
 */
export const transformationIterationLoop = inngest.createFunction(
  {
    id: 'transformation-iteration-loop',
    name: 'Transformation Iteration Loop',
    retries: 3,
    // Cancel if another run starts for the same plan
    cancelOn: [
      {
        event: 'transformation/plan.cancelled',
        match: 'data.planId',
      },
    ],
  },
  { event: 'transformation/plan.created' },
  async ({ event, step, logger }) => {
    const { planId, targetAsset, transformationType, maxIterations, accuracyThreshold } = event.data;

    logger.info(`Starting iteration loop for plan ${planId}`);

    // Get plan from database
    const plan = await step.run('fetch-plan', async () => {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('transformation_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw new Error(`Failed to fetch plan: ${error.message}`);
      return data;
    });

    // Check if this transformation type needs iteration
    if (SKIP_ITERATION_TYPES.includes(transformationType)) {
      logger.info(`Skipping iteration for ${transformationType}`);

      const code = await step.run('generate-code-simple', async () => {
        return generateTransformationCode(plan, null, null);
      });

      await step.run('update-plan-simple', async () => {
        const supabase = createServerClient();
        await supabase
          .from('transformation_plans')
          .update({
            generated_code: code,
            iteration_count: 1,
            status: 'pending_approval',
          })
          .eq('id', planId);
      });

      return { success: true, status: 'pending_approval', iterations: 1 };
    }

    // Update status to iterating
    await step.run('set-iterating-status', async () => {
      const supabase = createServerClient();
      await supabase
        .from('transformation_plans')
        .update({ status: 'iterating' })
        .eq('id', planId);
    });

    let currentCode: string | null = null;
    let lastResult: any = null;
    let satisfactory = false;
    let finalIteration = 0;
    let finalAccuracy = 0;

    // Self-improving iteration loop
    for (let iteration = 1; iteration <= (maxIterations || DEFAULT_MAX_ITERATIONS); iteration++) {
      logger.info(`Starting iteration ${iteration}/${maxIterations}`);
      finalIteration = iteration;

      // Step 1: Generate or improve code
      currentCode = await step.run(`generate-code-${iteration}`, async () => {
        return generateTransformationCode(plan, currentCode, lastResult);
      });

      // Step 2: Get sample data
      const sampleData = await step.run(`get-sample-${iteration}`, async () => {
        return getSampleData(targetAsset, DEFAULT_SAMPLE_SIZE);
      });

      // Step 3: Execute in sandbox
      const executionResult = await step.run(`execute-${iteration}`, async () => {
        return executeInE2BSandbox(currentCode!, sampleData);
      });

      // Step 4: Evaluate results
      const evaluation = await step.run(`evaluate-${iteration}`, async () => {
        return evaluateResults(executionResult, plan, accuracyThreshold || DEFAULT_ACCURACY_THRESHOLD);
      });

      finalAccuracy = evaluation.accuracy;

      // Step 5: Record iteration
      const iterationResult = {
        iterationNumber: iteration,
        code: currentCode,
        executionTimeMs: executionResult.executionTime,
        sampleSize: DEFAULT_SAMPLE_SIZE,
        success: executionResult.success,
        output: executionResult.output,
        error: executionResult.error,
        accuracy: evaluation.accuracy,
        meetsThreshold: evaluation.meetsThreshold,
        evaluationNotes: evaluation.notes,
        issuesFound: evaluation.issues,
        improvementsSuggested: evaluation.improvements,
        sampleBefore: executionResult.output?.sampleBefore || [],
        sampleAfter: executionResult.output?.sampleAfter || [],
      };

      await step.run(`record-iteration-${iteration}`, async () => {
        const supabase = createServerClient();
        await supabase.from('transformation_iterations').insert({
          plan_id: planId,
          iteration_number: iteration,
          code: currentCode,
          execution_time_ms: executionResult.executionTime,
          sample_size: DEFAULT_SAMPLE_SIZE,
          success: executionResult.success,
          output: executionResult.output,
          error_message: executionResult.error,
          accuracy: evaluation.accuracy,
          meets_threshold: evaluation.meetsThreshold,
          evaluation_notes: evaluation.notes,
          issues_found: evaluation.issues,
          improvements_suggested: evaluation.improvements,
          sample_before: iterationResult.sampleBefore,
          sample_after: iterationResult.sampleAfter,
        });

        // Update plan with progress
        await supabase
          .from('transformation_plans')
          .update({
            generated_code: currentCode,
            iteration_count: iteration,
            final_accuracy: evaluation.accuracy,
          })
          .eq('id', planId);
      });

      lastResult = iterationResult;
      satisfactory = evaluation.meetsThreshold;

      logger.info(`Iteration ${iteration} complete: ${evaluation.accuracy * 100}% accuracy`);

      if (satisfactory) {
        break;
      }
    }

    // Update final status
    const finalStatus = satisfactory ? 'pending_approval' : 'failed';

    await step.run('update-final-status', async () => {
      const supabase = createServerClient();
      await supabase
        .from('transformation_plans')
        .update({ status: finalStatus })
        .eq('id', planId);
    });

    logger.info(`Iteration loop complete: ${finalStatus} after ${finalIteration} iterations`);

    return {
      success: satisfactory,
      status: finalStatus,
      iterations: finalIteration,
      finalAccuracy,
    };
  }
);

// ============================================
// HELPER FUNCTIONS
// ============================================

async function generateTransformationCode(
  plan: any,
  previousCode: string | null,
  previousResult: any
): Promise<string> {
  const anthropic = new Anthropic();

  const systemPrompt = `You are a Python code generator for data transformations.
Generate ONLY executable Python code, no explanations.

The code should:
1. Define a 'transform(data)' function that takes a list of dictionaries
2. Return a list of transformed dictionaries
3. Handle edge cases and errors gracefully
4. Be efficient for large datasets

Output format: Just the Python code, nothing else.`;

  let userPrompt = `Generate Python transformation code for:
- Target asset: ${plan.target_asset}
- Target column: ${plan.target_column || 'all applicable'}
- Transformation type: ${plan.transformation_type}
- Description: ${plan.description}
- Parameters: ${JSON.stringify(plan.parameters || {})}`;

  if (previousCode && previousResult) {
    userPrompt += `

Previous attempt had ${previousResult.accuracy * 100}% accuracy.
Issues found: ${previousResult.issuesFound?.join(', ') || 'none'}
Improvements suggested: ${previousResult.improvementsSuggested?.join(', ') || 'none'}

Previous code:
\`\`\`python
${previousCode}
\`\`\`

Please improve the code to address these issues.`;
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract code from markdown blocks if present
  let code = content.text;
  const codeMatch = code.match(/```python\n?([\s\S]*?)\n?```/);
  if (codeMatch) {
    code = codeMatch[1];
  }

  return code;
}

async function getSampleData(targetAsset: string, sampleSize: number): Promise<any[]> {
  const supabase = createServerClient();

  // Determine table based on asset name
  const table = targetAsset.includes('silver_') ? targetAsset : `silver_${targetAsset}`;

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(sampleSize);

  if (error) {
    console.error(`Failed to get sample data: ${error.message}`);
    return [];
  }

  return data || [];
}

async function evaluateResults(
  executionResult: any,
  plan: any,
  threshold: number
): Promise<{
  accuracy: number;
  meetsThreshold: boolean;
  issues: string[];
  improvements: string[];
  notes: string;
}> {
  if (!executionResult.success) {
    return {
      accuracy: 0,
      meetsThreshold: false,
      issues: [executionResult.error || 'Execution failed'],
      improvements: ['Fix the execution error'],
      notes: 'Code execution failed',
    };
  }

  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You are evaluating a data transformation result.
Respond with a JSON object containing:
{
  "accuracy": 0.XX (0.0-1.0 based on how well transformation meets requirements),
  "issues": ["issue1", "issue2"],
  "improvements": ["improvement1"],
  "notes": "Brief analysis"
}`,
    messages: [
      {
        role: 'user',
        content: `Evaluate this transformation:
Description: ${plan.description}
Type: ${plan.transformation_type}
Target: ${plan.target_asset}.${plan.target_column || '*'}

Sample before: ${JSON.stringify(executionResult.output?.sampleBefore?.slice(0, 3) || [], null, 2)}
Sample after: ${JSON.stringify(executionResult.output?.sampleAfter?.slice(0, 3) || [], null, 2)}
Stats: ${JSON.stringify(executionResult.output?.stats || {}, null, 2)}

Required accuracy threshold: ${threshold * 100}%`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  try {
    // Try to parse JSON from response
    let jsonText = content.text;
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    const evaluation = JSON.parse(jsonText);

    return {
      accuracy: evaluation.accuracy || 0,
      meetsThreshold: evaluation.accuracy >= threshold,
      issues: evaluation.issues || [],
      improvements: evaluation.improvements || [],
      notes: evaluation.notes || '',
    };
  } catch {
    // Fallback if parsing fails
    return {
      accuracy: 0.5,
      meetsThreshold: false,
      issues: ['Could not properly evaluate results'],
      improvements: ['Improve output format'],
      notes: content.text.substring(0, 200),
    };
  }
}

// Export all functions
export const functions = [transformationIterationLoop];
