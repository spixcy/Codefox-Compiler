/**
 * C Executor — Local Run & Judge Engine Integration
 *
 * Implements the LanguageExecutor pattern for C.
 * Communicates with the local GCC/C11 compiler via the backend judge service
 * to compile and execute C solutions against test cases.
 */

export type CExecutionStatus =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'RUNTIME_ERROR'
  | 'COMPILE_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'EXECUTION_ERROR'
  | 'INTERNAL_ERROR';

export interface CExecutionResult {
  status: CExecutionStatus;
  passedTests: number;
  totalTests: number;
  runtime?: number;
  message?: string;
  results?: Array<{
    id: number;
    isPublic: boolean;
    input: any;
    expected: any;
    actual: any;
    passed: boolean;
    runtime: number;
  }>;
}

export interface CTestCase {
  id: number;
  input: Record<string, any>;
  expectedOutput: any;
  isPublic: boolean;
}

export async function executeCCode(
  userCode: string,
  testCases: CTestCase[],
  functionName: string,
): Promise<CExecutionResult> {
  try {
    const res = await fetch('http://localhost:3001/api/submissions/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'c',
        code: userCode,
        testCases,
        functionName,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        status: 'EXECUTION_ERROR',
        message: errData.error || `Server responded with HTTP ${res.status}`,
        passedTests: 0,
        totalTests: testCases.length,
      };
    }

    const data = await res.json();
    return data as CExecutionResult;

  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        message: 'Request timed out: C execution took longer than 15 seconds.',
        passedTests: 0,
        totalTests: testCases.length,
      };
    }

    return {
      status: 'INTERNAL_ERROR',
      message: `Failed to connect to C local judge service: ${err.message}. Ensure the local backend service is running.`,
      passedTests: 0,
      totalTests: testCases.length,
    };
  }
}
