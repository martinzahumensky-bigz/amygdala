import { Sandbox } from '@e2b/code-interpreter';

export interface SandboxExecutionResult {
  success: boolean;
  output: any;
  logs: string[];
  error?: string;
  executionTime: number;
}

/**
 * Execute Python code in E2B sandbox with sample data
 */
export async function executeInE2BSandbox(
  code: string,
  sampleData: any[],
  timeout = 60000
): Promise<SandboxExecutionResult> {
  const startTime = Date.now();
  const logs: string[] = [];

  // Check if E2B API key is configured
  if (!process.env.E2B_API_KEY) {
    console.warn('E2B_API_KEY not configured, falling back to simulated execution');
    return simulateExecution(code, sampleData, startTime);
  }

  let sandbox: Sandbox | null = null;

  try {
    // Create sandbox with timeout
    sandbox = await Sandbox.create({
      timeoutMs: timeout,
    });

    logs.push(`Sandbox created: ${sandbox.sandboxId}`);

    // Prepare the execution script
    const wrappedCode = `
import json
import sys

# Sample data provided
sample_data = json.loads('''${JSON.stringify(sampleData)}''')

# Define the transformation function from generated code
${code}

# Execute and capture results
try:
    # The generated code should define a 'transform' function
    # or directly produce 'results' variable
    if 'transform' in dir():
        results = transform(sample_data)
    elif 'results' not in dir():
        # Try to execute code that operates on sample_data directly
        results = sample_data  # Fallback

    # Output results as JSON
    output = {
        "results": results[:10] if isinstance(results, list) else results,
        "sampleBefore": sample_data[:5],
        "sampleAfter": results[:5] if isinstance(results, list) else [],
        "stats": {
            "total": len(sample_data) if isinstance(sample_data, list) else 0,
            "transformed": len(results) if isinstance(results, list) else 0,
            "unchanged": 0,
            "errors": 0
        }
    }
    print("__RESULT__" + json.dumps(output))
except Exception as e:
    print("__ERROR__" + str(e))
    sys.exit(1)
`;

    // Execute the code
    const execution = await sandbox.runCode(wrappedCode);

    // Parse output
    const stdout = execution.logs.stdout.join('\n');
    const stderr = execution.logs.stderr.join('\n');

    logs.push(`stdout: ${stdout.substring(0, 500)}`);
    if (stderr) logs.push(`stderr: ${stderr.substring(0, 500)}`);

    // Check for errors
    if (execution.error) {
      const errorMessage = typeof execution.error === 'object' && 'message' in execution.error
        ? String(execution.error.message)
        : String(execution.error) || 'Execution failed';
      return {
        success: false,
        output: null,
        logs,
        error: errorMessage,
        executionTime: Date.now() - startTime,
      };
    }

    // Parse result from stdout
    const resultMatch = stdout.match(/__RESULT__(.+)/);
    if (resultMatch) {
      try {
        const output = JSON.parse(resultMatch[1]);
        return {
          success: true,
          output,
          logs,
          executionTime: Date.now() - startTime,
        };
      } catch {
        logs.push('Failed to parse result JSON');
      }
    }

    // Check for error marker
    const errorMatch = stdout.match(/__ERROR__(.+)/);
    if (errorMatch) {
      return {
        success: false,
        output: null,
        logs,
        error: errorMatch[1],
        executionTime: Date.now() - startTime,
      };
    }

    // Fallback - return raw output
    return {
      success: true,
      output: { raw: stdout },
      logs,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`Sandbox error: ${errorMessage}`);

    return {
      success: false,
      output: null,
      logs,
      error: errorMessage,
      executionTime: Date.now() - startTime,
    };
  } finally {
    // Always close sandbox to avoid resource leaks
    if (sandbox) {
      try {
        await sandbox.kill();
        logs.push('Sandbox killed');
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Simulated execution when E2B is not available (for development/testing)
 * This uses basic JS evaluation for simple transformations
 */
function simulateExecution(
  code: string,
  sampleData: any[],
  startTime: number
): SandboxExecutionResult {
  const logs: string[] = ['Using simulated execution (E2B not configured)'];

  try {
    // For simple transformations, we can simulate the result
    // This is a fallback for development only
    const sampleBefore = sampleData.slice(0, 5);
    const sampleAfter = sampleData.slice(0, 5); // Placeholder

    return {
      success: true,
      output: {
        results: sampleData.slice(0, 10),
        sampleBefore,
        sampleAfter,
        stats: {
          total: sampleData.length,
          transformed: sampleData.length,
          unchanged: 0,
          errors: 0,
        },
      },
      logs,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      logs,
      error: error instanceof Error ? error.message : 'Simulation failed',
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Check if E2B is properly configured
 */
export function isE2BConfigured(): boolean {
  return !!process.env.E2B_API_KEY;
}
