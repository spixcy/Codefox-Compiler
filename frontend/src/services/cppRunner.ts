/**
 * C++ Executor — Local Run & Judge Engine Integration
 *
 * Implements the LanguageExecutor pattern for C++.
 * Communicates with the local compiler toolchain / WebAssembly judge service
 * to compile and execute C++ solutions against test cases.
 */

export type CppExecutionStatus =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'RUNTIME_ERROR'
  | 'COMPILE_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'EXECUTION_ERROR'
  | 'INTERNAL_ERROR';

export interface CppExecutionResult {
  status: CppExecutionStatus;
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

export interface CppTestCase {
  id: number;
  input: Record<string, any>;
  expectedOutput: any;
  isPublic: boolean;
}

export async function executeCppSolution(
  userCode: string,
  testCases: CppTestCase[],
  functionName: string,
): Promise<CppExecutionResult> {
  try {
    const res = await fetch('http://localhost:3001/api/submissions/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'cpp',
        code: userCode,
        testCases,
        functionName,
      }),
      signal: AbortSignal.timeout(12000),
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
    return data as CppExecutionResult;

  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        message: 'Request timed out: C++ execution took longer than 12 seconds.',
        passedTests: 0,
        totalTests: testCases.length,
      };
    }

    return {
      status: 'INTERNAL_ERROR',
      message: `Failed to connect to C++ local judge service: ${err.message}. Ensure the local backend service is running.`,
      passedTests: 0,
      totalTests: testCases.length,
    };
  }
}
