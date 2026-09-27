/**
 * Unified language executor.
 * Routes to the correct local runner based on the selected language.
 * Python  → Pyodide (WASM)
 * Java    → CheerpJ (WASM JVM + Local OpenJDK fallback)
 * C++     → GCC/G++ (Local Toolchain / Emscripten)
 * C       → GCC C11 (Local Toolchain)
 */
import { executePythonSolution, type ExecutionResult } from './pythonRunner';
import { executeJavaSolution, initCheerpJ, type JavaExecutionResult } from './javaRunner';
import { executeCppSolution, type CppExecutionResult } from './cppRunner';
import { executeCCode, type CExecutionResult } from './cRunner';

export type SupportedLanguage = 'python' | 'java' | 'cpp' | 'c';

export interface ExecutionRequest {
  language: SupportedLanguage;
  code: string;
  testCases: Array<{
    id: number;
    input: Record<string, any>;
    expectedOutput: any;
    isPublic: boolean;
    order?: number;
  }>;
  functionName: string;
}

export type UnifiedResult = ExecutionResult | JavaExecutionResult | CppExecutionResult | CExecutionResult;

export async function executeCode(request: ExecutionRequest): Promise<UnifiedResult> {
  const { language, code, testCases, functionName } = request;

  if (language === 'python') {
    return executePythonSolution(code, testCases, functionName);
  }

  if (language === 'java') {
    return executeJavaSolution(code, testCases, functionName);
  }

  if (language === 'cpp') {
    return executeCppSolution(code, testCases, functionName);
  }

  if (language === 'c') {
    return executeCCode(code, testCases, functionName);
  }

  return {
    status: 'EXECUTION_ERROR' as const,
    message: `Unsupported language: ${language}`,
    passedTests: 0,
    totalTests: testCases.length,
  };
}

export { initCheerpJ };
