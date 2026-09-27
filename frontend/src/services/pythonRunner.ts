// Client-side Python Execution Engine using Pyodide (Local WebAssembly)
declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
  }
}

let pyodideInstance: any = null;
let pyodideLoadingPromise: Promise<any> | null = null;

export async function initPyodide(): Promise<any> {
  if (pyodideInstance) return pyodideInstance;

  if (!pyodideLoadingPromise) {
    pyodideLoadingPromise = (async () => {
      // 1. Ensure pyodide.js script is loaded if not already
      if (!window.loadPyodide) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/pyodide/pyodide.js';
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error('Failed to load local /pyodide/pyodide.js'));
          document.head.appendChild(script);
        });
      }

      // 2. Initialize Pyodide pointing to local static assets
      console.log('Loading local Pyodide WebAssembly runtime...');
      const py = await window.loadPyodide({
        indexURL: '/pyodide/',
      });
      console.log('Pyodide WebAssembly runtime ready!');
      pyodideInstance = py;
      return py;
    })();
  }

  return pyodideLoadingPromise;
}

export interface ExecutionTestCase {
  id: number;
  input: Record<string, any>;
  expectedOutput: any;
  isPublic: boolean;
}

export interface ExecutionResult {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'EXECUTION_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'INTERNAL_ERROR';
  message?: string;
  passedTests: number;
  totalTests: number;
  runtime?: number;
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

export async function executePythonSolution(
  userCode: string,
  testCases: ExecutionTestCase[],
  functionName: string
): Promise<ExecutionResult> {
  try {
    const py = await initPyodide();

    // Harness script to run inside Pyodide
    const harness = `
import json
import time
import traceback

def __run_suite(user_code, test_cases_json, func_name):
    # Isolated scope for user submission
    user_scope = {}
    try:
        exec(user_code, user_scope)
    except Exception:
        return json.dumps({
            "status": "RUNTIME_ERROR",
            "message": traceback.format_exc(),
            "passedTests": 0,
            "totalTests": len(json.loads(test_cases_json)),
            "results": []
        })

    if func_name not in user_scope:
        return json.dumps({
            "status": "EXECUTION_ERROR",
            "message": f"Function '{func_name}' was not found in your code.\\nPlease make sure to define 'def {func_name}(...):'",
            "passedTests": 0,
            "totalTests": len(json.loads(test_cases_json)),
            "results": []
        })

    fn = user_scope[func_name]
    cases = json.loads(test_cases_json)
    passed_count = 0
    total_time = 0.0
    results = []

    for idx, tc in enumerate(cases):
        raw_input = tc.get("input", {})
        expected = tc.get("expectedOutput")
        
        t0 = time.perf_counter()
        try:
            if isinstance(raw_input, dict):
                actual = fn(**raw_input)
            elif isinstance(raw_input, list):
                actual = fn(*raw_input)
            else:
                actual = fn(raw_input)
            
            t1 = time.perf_counter()
            elapsed = t1 - t0
            total_time += elapsed

            # Standard comparison
            passed = (actual == expected)
            if passed:
                passed_count += 1

            results.append({
                "id": tc.get("id", idx + 1),
                "isPublic": tc.get("isPublic", False),
                "input": raw_input,
                "expected": expected,
                "actual": actual,
                "passed": passed,
                "runtime": round(elapsed, 5)
            })

            # For online judge, stop after first failure on submit
            if not passed:
                break
        except Exception:
            return json.dumps({
                "status": "RUNTIME_ERROR",
                "message": f"Runtime Error on test case {idx + 1}:\\n" + traceback.format_exc(),
                "passedTests": passed_count,
                "totalTests": len(cases),
                "results": results
            })

    total = len(cases)
    final_status = "ACCEPTED" if passed_count == total else "WRONG_ANSWER"
    fail_msg = None
    if final_status == "WRONG_ANSWER":
        fail_msg = f"Wrong Answer on test case {passed_count + 1}."

    return json.dumps({
        "status": final_status,
        "passedTests": passed_count,
        "totalTests": total,
        "runtime": round(total_time, 4),
        "message": fail_msg,
        "results": results
    })
`;

    // Install harness in Python
    await py.runPythonAsync(harness);

    // Call runner
    const runner = py.globals.get('__run_suite');
    const rawResultJson = runner(userCode, JSON.stringify(testCases), functionName);
    
    return JSON.parse(rawResultJson) as ExecutionResult;
  } catch (err: any) {
    return {
      status: 'INTERNAL_ERROR',
      message: err.message || 'Execution error in local WebAssembly runtime',
      passedTests: 0,
      totalTests: testCases.length,
      results: []
    };
  }
}
