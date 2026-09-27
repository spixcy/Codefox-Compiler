// Pyodide in-browser Web Worker
import { loadPyodide, type PyodideInterface } from 'pyodide';

let pyodideInstance: PyodideInterface | null = null;
let pyodidePromise: Promise<PyodideInterface> | null = null;

async function getPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/',
    }).then((py) => {
      pyodideInstance = py;
      return py;
    });
  }
  return pyodidePromise;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, code, testCases, functionName } = e.data;

  if (type === 'INIT') {
    try {
      await getPyodide();
      self.postMessage({ type: 'READY' });
    } catch (err: any) {
      self.postMessage({ type: 'INIT_ERROR', error: err.message });
    }
    return;
  }

  if (type === 'EXECUTE') {
    try {
      const pyodide = await getPyodide();

      // Reset environment namespace
      pyodide.runPython(`
import sys
import json
import time

for mod in list(sys.modules.keys()):
    if mod == 'user_solution':
        del sys.modules[mod]
`);

      // Prepare harness script
      const harnessScript = `
import json
import time
import traceback

def __run_tests(user_code_str, test_cases_json_str, target_func_name):
    scope = {}
    try:
        exec(user_code_str, scope)
    except Exception as e:
        return json.dumps({
            "status": "RUNTIME_ERROR",
            "message": traceback.format_exc(),
            "passedTests": 0,
            "totalTests": len(json.loads(test_cases_json_str))
        })
    
    if target_func_name not in scope:
        return json.dumps({
            "status": "EXECUTION_ERROR",
            "message": f"Function '{target_func_name}' was not found in your code.",
            "passedTests": 0,
            "totalTests": len(json.loads(test_cases_json_str))
        })

    fn = scope[target_func_name]
    test_cases = json.loads(test_cases_json_str)
    passed_count = 0
    total_time = 0.0
    case_results = []
    
    for idx, tc in enumerate(test_cases):
        inputs = tc.get("input", {})
        expected = tc.get("expectedOutput")
        
        t0 = time.perf_counter()
        try:
            if isinstance(inputs, dict):
                actual = fn(**inputs)
            elif isinstance(inputs, list):
                actual = fn(*inputs)
            else:
                actual = fn(inputs)
            t1 = time.perf_counter()
            elapsed = t1 - t0
            total_time += elapsed

            is_correct = (actual == expected)
            if is_correct:
                passed_count += 1

            case_results.append({
                "id": tc.get("id", idx + 1),
                "isPublic": tc.get("isPublic", False),
                "input": inputs,
                "expected": expected,
                "actual": actual,
                "passed": is_correct,
                "runtime": round(elapsed, 4)
            })

            if not is_correct:
                break
        except Exception as e:
            return json.dumps({
                "status": "RUNTIME_ERROR",
                "message": f"Runtime Error on test case {idx + 1}:\\n" + traceback.format_exc(),
                "passedTests": passed_count,
                "totalTests": len(test_cases),
                "results": case_results
            })

    total_tests = len(test_cases)
    final_status = "ACCEPTED" if passed_count == total_tests else "WRONG_ANSWER"
    fail_msg = None
    if final_status == "WRONG_ANSWER":
        fail_msg = f"Failed on test case {passed_count + 1}."

    return json.dumps({
        "status": final_status,
        "passedTests": passed_count,
        "totalTests": total_tests,
        "runtime": round(total_time, 4),
        "message": fail_msg,
        "results": case_results
    })
`;

      await pyodide.runPythonAsync(harnessScript);

      const runnerFunc = pyodide.globals.get('__run_tests');
      const rawResultStr = runnerFunc(code, JSON.stringify(testCases), functionName);

      const result = JSON.parse(rawResultStr);
      self.postMessage({ type: 'RESULT', data: result });
    } catch (err: any) {
      self.postMessage({
        type: 'RESULT',
        data: {
          status: 'INTERNAL_ERROR',
          message: err.message || 'Execution error in WebAssembly runtime',
          passedTests: 0,
          totalTests: testCases.length,
        }
      });
    }
  }
};
