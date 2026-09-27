/**
 * Java Executor — In-Browser (CheerpJ) with Local Fallback
 *
 * Execution Strategy:
 * 1. Checks if local judge API (OpenJDK 21) is available for ultra-fast native execution (1-5ms).
 * 2. Or executes via CheerpJ in WebAssembly environment.
 * 3. Never fails with disabled buttons or frozen state.
 */

export type JavaExecutionStatus =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'RUNTIME_ERROR'
  | 'COMPILE_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'EXECUTION_ERROR'
  | 'INTERNAL_ERROR';

export interface JavaExecutionResult {
  status: JavaExecutionStatus;
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

export interface JavaTestCase {
  id: number;
  input: Record<string, any>;
  expectedOutput: any;
  isPublic: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// CheerpJ initialisation
// ────────────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    cheerpjInit: (opts?: any) => Promise<void>;
    cheerpjRunMain: (cls: string, jar: string, ...args: string[]) => Promise<any>;
    cheerpjAddStringFile: (path: string, content: string) => void;
  }
}

let cheerpjReady = false;
let cheerpjPromise: Promise<void> | null = null;

export async function initCheerpJ(): Promise<void> {
  if (cheerpjReady) return;
  if (cheerpjPromise) return cheerpjPromise;

  cheerpjPromise = (async () => {
    // Check if local API is already alive
    try {
      const ping = await fetch('http://localhost:3001/api/problems', { signal: AbortSignal.timeout(1000) });
      if (ping.ok) {
        cheerpjReady = true;
        console.log('[JavaRunner] Local Java Judge Engine is connected.');
        return;
      }
    } catch (e) {}

    // Otherwise load CheerpJ 3 loader script
    if (!window.cheerpjInit) {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[src*="cj3loader.js"]');
        if (existing) {
          return resolve();
        }
        const s = document.createElement('script');
        s.src = 'https://cjrtnc.leaningtech.com/3.0/cj3loader.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load CheerpJ runtime script'));
        document.head.appendChild(s);
      });
    }

    if (window.cheerpjInit) {
      await window.cheerpjInit({
        version: 8,
      });
      cheerpjReady = true;
      console.log('[JavaRunner] CheerpJ 3 JVM ready');
    } else {
      cheerpjReady = true; // Fallback ready
    }
  })();

  return cheerpjPromise;
}

// ────────────────────────────────────────────────────────────────────────────
// Test harness generator
// ────────────────────────────────────────────────────────────────────────────

function generateHarness(functionName: string, testCases: JavaTestCase[]): string {
  const cases = testCases.map((tc, idx) => {
    const args = buildJavaArgs(tc.input);
    const callExpr = `solution.${functionName}(${args})`;
    const expectedJson = JSON.stringify(tc.expectedOutput);
    return `
        // Test case ${idx + 1}
        {
            long t0 = System.nanoTime();
            Object actual_${idx} = normalise(${callExpr});
            long t1 = System.nanoTime();
            String expected_${idx} = ${JSON.stringify(expectedJson)};
            String actual_str_${idx} = toJson(actual_${idx});
            boolean passed_${idx} = expected_${idx}.equals(actual_str_${idx});
            System.out.println("{" +
                "\\"id\\":" + ${tc.id} + "," +
                "\\"isPublic\\":" + ${tc.isPublic} + "," +
                "\\"expected\\":" + expected_${idx} + "," +
                "\\"actual\\":" + actual_str_${idx} + "," +
                "\\"passed\\":" + passed_${idx} + "," +
                "\\"runtime\\":" + ((t1 - t0) / 1_000_000_000.0) +
            "}");
        }`;
  }).join('\n');

  return `
import java.util.*;
import java.util.stream.*;

public class Runner {
    public static void main(String[] args) {
        Solution solution = new Solution();
        ${cases}
    }

    static Object normalise(Object v) {
        if (v instanceof int[]) {
            int[] a = (int[]) v;
            List<Integer> lst = new ArrayList<>();
            for (int x : a) lst.add(x);
            Collections.sort(lst);
            return lst;
        }
        if (v instanceof String[]) {
            return Arrays.asList((String[]) v);
        }
        if (v instanceof boolean[]) {
            boolean[] a = (boolean[]) v;
            List<Boolean> lst = new ArrayList<>();
            for (boolean x : a) lst.add(x);
            return lst;
        }
        if (v instanceof char[]) {
            char[] a = (char[]) v;
            List<Character> lst = new ArrayList<>();
            for (char x : a) lst.add(x);
            return lst;
        }
        if (v instanceof List) {
            List<?> lst = (List<?>) v;
            List<Object> sorted = new ArrayList<>(lst);
            try { Collections.sort((List) sorted); } catch (Exception ignored) {}
            return sorted;
        }
        return v;
    }

    static String toJson(Object v) {
        if (v == null) return "null";
        if (v instanceof Integer || v instanceof Long || v instanceof Double || v instanceof Boolean) return v.toString();
        if (v instanceof String) return "\\"" + v + "\\"";
        if (v instanceof List) {
            List<?> l = (List<?>) v;
            return "[" + l.stream().map(Runner::toJson).collect(Collectors.joining(",")) + "]";
        }
        return "\\"" + v.toString() + "\\"";
    }
}`;
}

function buildJavaArgs(input: Record<string, any>): string {
  return Object.values(input).map(v => jsValueToJavaLiteral(v)).join(', ');
}

function jsValueToJavaLiteral(v: any): string {
  if (Array.isArray(v)) {
    if (v.length === 0) return 'new int[]{}';
    if (typeof v[0] === 'number' && Number.isInteger(v[0])) {
      return `new int[]{${v.join(',')}}`;
    }
    if (typeof v[0] === 'string' && v[0].length === 1) {
      return `new char[]{${v.map((c: string) => `'${c}'`).join(',')}}`;
    }
    if (typeof v[0] === 'string') {
      return `new String[]{${v.map((s: string) => `"${s}"`).join(',')}}`;
    }
    return `new int[]{${v.join(',')}}`;
  }
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'boolean') return v.toString();
  if (typeof v === 'number') return v.toString();
  return JSON.stringify(v);
}

// ────────────────────────────────────────────────────────────────────────────
// Main executor
// ────────────────────────────────────────────────────────────────────────────

export async function executeJavaSolution(
  userCode: string,
  testCases: JavaTestCase[],
  functionName: string,
): Promise<JavaExecutionResult> {
  // Strategy 1: Ultra-fast local execution engine (OpenJDK on user machine)
  try {
    const res = await fetch('http://localhost:3001/api/submissions/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'java',
        code: userCode,
        testCases,
        functionName
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (res.ok) {
      const data = await res.json();
      return data as JavaExecutionResult;
    }
  } catch (backendErr) {
    // If backend is unreachable, proceed to in-browser CheerpJ
  }

  // Strategy 2: In-browser CheerpJ WebAssembly
  try {
    await initCheerpJ();

    if (window.cheerpjRunMain && window.cheerpjAddStringFile) {
      const harness = generateHarness(functionName, testCases);
      window.cheerpjAddStringFile('/str/Solution.java', userCode);
      window.cheerpjAddStringFile('/str/Runner.java', harness);

      // Compile with ECJ in memory
      const compileResult = await runWithTimeout(
        window.cheerpjRunMain(
          'org.eclipse.jdt.internal.compiler.batch.Main',
          '/app/java/ecj.jar',
          '-source', '8', '-target', '8',
          '-nowarn',
          '-d', '/str/',
          '/str/Solution.java',
          '/str/Runner.java',
        ),
        10000,
        'Compilation timed out'
      );

      const compileOutput = String(compileResult ?? '');
      if (compileOutput && compileOutput.includes('ERROR')) {
        return {
          status: 'COMPILE_ERROR',
          message: compileOutput.trim(),
          passedTests: 0,
          totalTests: testCases.length,
        };
      }

      // Execute Runner class
      const startTs = performance.now();
      const execResult = await runWithTimeout(
        window.cheerpjRunMain('Runner', '/str/'),
        8000,
        'TIME_LIMIT_EXCEEDED'
      );
      const rawOutput = String(execResult ?? '');
      const totalRuntime = (performance.now() - startTs) / 1000;

      const lines = rawOutput.split('\n').map(l => l.trim()).filter(l => l.startsWith('{'));
      const results: any[] = [];
      let passedCount = 0;

      for (const line of lines) {
        try {
          const r = JSON.parse(line);
          results.push(r);
          if (r.passed) passedCount++;
        } catch {}
      }

      const status = passedCount === testCases.length ? 'ACCEPTED' : 'WRONG_ANSWER';
      return {
        status,
        passedTests: passedCount,
        totalTests: testCases.length,
        runtime: Math.round(totalRuntime * 10000) / 10000,
        message: status === 'WRONG_ANSWER' ? `Wrong Answer on test case ${passedCount + 1}` : undefined,
        results
      };
    }
  } catch (err: any) {
    return {
      status: 'RUNTIME_ERROR',
      message: err.message || 'Execution error in Java runtime',
      passedTests: 0,
      totalTests: testCases.length,
    };
  }

  return {
    status: 'EXECUTION_ERROR',
    message: 'Could not connect to Java execution runtime. Ensure backend or CheerpJ is available.',
    passedTests: 0,
    totalTests: testCases.length,
  };
}

function runWithTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(msg)), ms);
    promise.then(v => { clearTimeout(id); resolve(v); })
           .catch(e => { clearTimeout(id); reject(e); });
  });
}
