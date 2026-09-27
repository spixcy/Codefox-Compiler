import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

export interface JudgeResult {
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'COMPILE_ERROR' | 'EXECUTION_ERROR' | 'INTERNAL_ERROR';
  message?: string;
  passedTests: number;
  totalTests: number;
  runtime?: number;
  memory?: number;
  results?: any[];
}

export class JudgeService {
  private static workspaceDir = path.join(process.cwd(), 'temp_workspace');

  static async init() {
    try {
      await fs.mkdir(this.workspaceDir, { recursive: true });
    } catch (e) {}
  }

  static async runPythonCode(code: string, testCases: any[], functionName: string): Promise<JudgeResult> {
    const submissionId = crypto.randomUUID();
    const submissionDir = path.join(this.workspaceDir, submissionId);
    
    try {
      await fs.mkdir(submissionDir, { recursive: true });
      await fs.writeFile(path.join(submissionDir, 'solution.py'), code);
      await fs.writeFile(path.join(submissionDir, 'test_cases.json'), JSON.stringify(testCases));
      await fs.writeFile(path.join(submissionDir, 'config.json'), JSON.stringify({ functionName }));

      // Run docker container or fallback to local python
      try {
        const dockerCmd = `docker run --rm --network none -m 128m --cpus 0.5 -v ${submissionDir}:/app/workspace python-runner`;
        const { stdout } = await execAsync(dockerCmd, { timeout: 5000 });
        const lastLine = stdout.trim().split('\n').pop();
        if (lastLine) return JSON.parse(lastLine) as JudgeResult;
      } catch (dockerErr: any) {
        // Fallback to local python runner if docker is not running
        const runnerScript = path.join(process.cwd(), '..', 'judge-service', 'execution', 'docker', 'runner.py');
        const fallbackCmd = `python "${runnerScript}"`;
        const env = { ...process.env, WORKSPACE_PATH: submissionDir };
        
        // Simulating the runner reading from /app/workspace -> submissionDir
        await fs.mkdir(path.join(submissionDir, 'app', 'workspace'), { recursive: true });
        await fs.copyFile(path.join(submissionDir, 'solution.py'), path.join(submissionDir, 'app', 'workspace', 'solution.py'));
        await fs.copyFile(path.join(submissionDir, 'test_cases.json'), path.join(submissionDir, 'app', 'workspace', 'test_cases.json'));
        await fs.copyFile(path.join(submissionDir, 'config.json'), path.join(submissionDir, 'app', 'workspace', 'config.json'));

        const { stdout } = await execAsync(fallbackCmd, {
          cwd: submissionDir,
          timeout: 5000,
          env
        });
        const lastLine = stdout.trim().split('\n').pop();
        if (lastLine) return JSON.parse(lastLine) as JudgeResult;
      }

      return {
        status: 'EXECUTION_ERROR',
        message: 'No output from Python execution',
        passedTests: 0,
        totalTests: testCases.length
      };
    } catch (error: any) {
      if (error.killed) {
        return {
          status: 'TIME_LIMIT_EXCEEDED',
          message: 'Time Limit Exceeded: Execution took longer than 5 seconds',
          passedTests: 0,
          totalTests: testCases.length
        };
      }
      return {
        status: 'INTERNAL_ERROR',
        message: `Execution failed: ${error.message}`,
        passedTests: 0,
        totalTests: testCases.length
      };
    } finally {
      try {
        await fs.rm(submissionDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  static async runJavaCode(code: string, testCases: any[], functionName: string): Promise<JudgeResult> {
    const submissionId = crypto.randomUUID();
    const submissionDir = path.join(this.workspaceDir, submissionId);

    try {
      await fs.mkdir(submissionDir, { recursive: true });

      // 1. Write user Solution.java
      await fs.writeFile(path.join(submissionDir, 'Solution.java'), code);

      // 2. Generate and write Runner.java
      const runnerCode = this.generateJavaRunner(functionName, testCases);
      await fs.writeFile(path.join(submissionDir, 'Runner.java'), runnerCode);

      // 3. Compile Solution.java and Runner.java
      try {
        await execAsync('javac Solution.java Runner.java', {
          cwd: submissionDir,
          timeout: 8000
        });
      } catch (compileErr: any) {
        return {
          status: 'COMPILE_ERROR',
          message: compileErr.stderr || compileErr.stdout || compileErr.message || 'Compilation Error',
          passedTests: 0,
          totalTests: testCases.length
        };
      }

      // 4. Run Runner
      let stdout = '';
      try {
        const res = await execAsync('java Runner', {
          cwd: submissionDir,
          timeout: 6000
        });
        stdout = res.stdout;
      } catch (runErr: any) {
        if (runErr.killed) {
          return {
            status: 'TIME_LIMIT_EXCEEDED',
            message: 'Time Limit Exceeded: Execution exceeded 6 seconds',
            passedTests: 0,
            totalTests: testCases.length
          };
        }
        return {
          status: 'RUNTIME_ERROR',
          message: runErr.stderr || runErr.stdout || runErr.message || 'Runtime Error',
          passedTests: 0,
          totalTests: testCases.length
        };
      }

      // 5. Parse output lines
      const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.startsWith('{'));
      if (lines.length === 0) {
        return {
          status: 'RUNTIME_ERROR',
          message: 'No test case output captured.\n' + stdout,
          passedTests: 0,
          totalTests: testCases.length
        };
      }

      const caseResults: any[] = [];
      let passedCount = 0;
      let totalRuntime = 0.0;

      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          caseResults.push(item);
          if (item.passed) passedCount++;
          if (item.runtime) totalRuntime += item.runtime;
        } catch (e) {}
      }

      const finalStatus = passedCount === testCases.length ? 'ACCEPTED' : 'WRONG_ANSWER';
      const failMsg = finalStatus === 'WRONG_ANSWER' ? `Failed on test case ${passedCount + 1}` : undefined;

      return {
        status: finalStatus,
        passedTests: passedCount,
        totalTests: testCases.length,
        runtime: Math.round(totalRuntime * 10000) / 10000,
        message: failMsg,
        results: caseResults
      };

    } catch (err: any) {
      return {
        status: 'INTERNAL_ERROR',
        message: err.message || 'Internal Judge Service error',
        passedTests: 0,
        totalTests: testCases.length
      };
    } finally {
      try {
        await fs.rm(submissionDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  private static generateJavaRunner(functionName: string, testCases: any[]): string {
    const cases = testCases.map((tc, idx) => {
      let inputObj = tc.input;
      if (typeof inputObj === 'string') {
        try { inputObj = JSON.parse(inputObj); } catch (e) {}
      }
      let expectedObj = tc.expectedOutput;
      if (typeof expectedObj === 'string') {
        try { expectedObj = JSON.parse(expectedObj); } catch (e) {}
      }

      const args = Object.values(inputObj || {}).map(v => this.valueToJavaLiteral(v)).join(', ');
      const expectedJson = JSON.stringify(expectedObj);

      return `
        {
          long t0 = System.nanoTime();
          Object actualObj = null;
          try {
            actualObj = normalise(solution.${functionName}(${args}));
          } catch (Exception ex) {
            System.out.println("{\\"id\\":${tc.id || idx + 1},\\"passed\\":false,\\"error\\":\\"" + ex.toString() + "\\"}");
            return;
          }
          long t1 = System.nanoTime();
          String expectedStr = ${JSON.stringify(expectedJson)};
          String actualStr = toJson(actualObj);
          boolean isPassed = expectedStr.equals(actualStr);
          System.out.println("{" +
            "\\"id\\":" + ${tc.id || idx + 1} + "," +
            "\\"isPublic\\":" + ${Boolean(tc.isPublic)} + "," +
            "\\"expected\\":" + expectedStr + "," +
            "\\"actual\\":" + actualStr + "," +
            "\\"passed\\":" + isPassed + "," +
            "\\"runtime\\":" + ((t1 - t0) / 1_000_000_000.0) +
          "}");
        }
      `;
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
            int[] arr = (int[]) v;
            List<Integer> list = new ArrayList<>();
            for (int x : arr) list.add(x);
            Collections.sort(list);
            return list;
        }
        if (v instanceof String[]) {
            return Arrays.asList((String[]) v);
        }
        if (v instanceof boolean[]) {
            boolean[] arr = (boolean[]) v;
            List<Boolean> list = new ArrayList<>();
            for (boolean b : arr) list.add(b);
            return list;
        }
        if (v instanceof char[]) {
            char[] arr = (char[]) v;
            List<Character> list = new ArrayList<>();
            for (char c : arr) list.add(c);
            return list;
        }
        if (v instanceof List) {
            List<?> list = (List<?>) v;
            List<Object> copy = new ArrayList<>(list);
            try { Collections.sort((List) copy); } catch (Exception ignored) {}
            return copy;
        }
        return v;
    }

    static String toJson(Object v) {
        if (v == null) return "null";
        if (v instanceof Integer || v instanceof Long || v instanceof Double || v instanceof Boolean) {
            return v.toString();
        }
        if (v instanceof String) {
            return "\\"" + v + "\\"";
        }
        if (v instanceof List) {
            List<?> l = (List<?>) v;
            return "[" + l.stream().map(Runner::toJson).collect(Collectors.joining(",")) + "]";
        }
        return "\\"" + v.toString() + "\\"";
    }
}
    `;
  }

  private static valueToJavaLiteral(v: any): string {
    if (Array.isArray(v)) {
      if (v.length === 0) return 'new int[]{}';
      if (typeof v[0] === 'number') {
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
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return v.toString();
    return JSON.stringify(v);
  }
  static async runCppCode(code: string, testCases: any[], functionName: string): Promise<JudgeResult> {
    const submissionId = crypto.randomUUID();
    const submissionDir = path.join(this.workspaceDir, submissionId);

    try {
      await fs.mkdir(submissionDir, { recursive: true });

      // 1. Write user Solution.h
      await fs.writeFile(path.join(submissionDir, 'Solution.h'), code);

      // 2. Generate and write runner.cpp
      const runnerCode = this.generateCppRunner(functionName, testCases);
      await fs.writeFile(path.join(submissionDir, 'runner.cpp'), runnerCode);

      // 3. Compile runner.cpp with g++ (C++14 / C++17)
      try {
        await execAsync('g++ -O2 -std=c++14 runner.cpp -o runner.exe', {
          cwd: submissionDir,
          timeout: 8000
        });
      } catch (compileErr: any) {
        return {
          status: 'COMPILE_ERROR',
          message: compileErr.stderr || compileErr.stdout || compileErr.message || 'C++ Compilation Error',
          passedTests: 0,
          totalTests: testCases.length
        };
      }

      // 4. Run runner.exe
      let stdout = '';
      try {
        const res = await execAsync('runner.exe', {
          cwd: submissionDir,
          timeout: 5000
        });
        stdout = res.stdout;
      } catch (runErr: any) {
        if (runErr.killed) {
          return {
            status: 'TIME_LIMIT_EXCEEDED',
            message: 'Time Limit Exceeded: Execution exceeded 5 seconds',
            passedTests: 0,
            totalTests: testCases.length
          };
        }
        return {
          status: 'RUNTIME_ERROR',
          message: runErr.stderr || runErr.stdout || runErr.message || 'C++ Runtime Crash',
          passedTests: 0,
          totalTests: testCases.length
        };
      }

      // 5. Parse test results
      const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.startsWith('{'));
      if (lines.length === 0) {
        return {
          status: 'RUNTIME_ERROR',
          message: 'No test case output captured.\n' + stdout,
          passedTests: 0,
          totalTests: testCases.length
        };
      }

      const caseResults: any[] = [];
      let passedCount = 0;
      let totalRuntime = 0.0;

      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          caseResults.push(item);
          if (item.passed) passedCount++;
          if (item.runtime) totalRuntime += item.runtime;
        } catch (e) {}
      }

      const finalStatus = passedCount === testCases.length ? 'ACCEPTED' : 'WRONG_ANSWER';
      const failMsg = finalStatus === 'WRONG_ANSWER' ? `Failed on test case ${passedCount + 1}` : undefined;

      return {
        status: finalStatus,
        passedTests: passedCount,
        totalTests: testCases.length,
        runtime: Math.round(totalRuntime * 10000) / 10000,
        message: failMsg,
        results: caseResults
      };

    } catch (err: any) {
      return {
        status: 'INTERNAL_ERROR',
        message: err.message || 'Internal Judge Service error',
        passedTests: 0,
        totalTests: testCases.length
      };
    } finally {
      try {
        await fs.rm(submissionDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  private static generateCppRunner(functionName: string, testCases: any[]): string {
    const cases = testCases.map((tc, idx) => {
      let inputObj = tc.input;
      if (typeof inputObj === 'string') {
        try { inputObj = JSON.parse(inputObj); } catch (e) {}
      }
      let expectedObj = tc.expectedOutput;
      if (typeof expectedObj === 'string') {
        try { expectedObj = JSON.parse(expectedObj); } catch (e) {}
      }

      const argEntries = Object.values(inputObj || {});
      const argDecls = argEntries.map((v, i) => `auto arg_${i} = ${this.valueToCppLiteral(v)};`).join('\n          ');
      const argNames = argEntries.map((_, i) => `arg_${i}`).join(', ');
      const expectedJson = JSON.stringify(expectedObj);

      return `
        {
          ${argDecls}
          auto t0 = chrono::high_resolution_clock::now();
          auto actualVal = solution.${functionName}(${argNames});
          auto t1 = chrono::high_resolution_clock::now();
          double elapsed = chrono::duration<double>(t1 - t0).count();
          string expectedStr = ${JSON.stringify(expectedJson)};
          string actualStr = toJson(actualVal);
          bool isPassed = (expectedStr == actualStr);
          cout << "{"
               << "\\"id\\":" << ${tc.id || idx + 1} << ","
               << "\\"isPublic\\":" << (${Boolean(tc.isPublic)} ? "true" : "false") << ","
               << "\\"expected\\":" << expectedStr << ","
               << "\\"actual\\":" << actualStr << ","
               << "\\"passed\\":" << (isPassed ? "true" : "false") << ","
               << "\\"runtime\\":" << elapsed
               << "}" << endl;
        }
      `;
    }).join('\n');

    return `
#include <iostream>
#include <vector>
#include <string>
#include <chrono>
#include <algorithm>
#include <sstream>

#include "Solution.h"

using namespace std;

static string toJson(int v) { return to_string(v); }
static string toJson(bool v) { return v ? "true" : "false"; }
static string toJson(const string& s) { return "\\"" + s + "\\""; }
static string toJson(vector<int> v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); ++i) {
        s += to_string(v[i]);
        if (i + 1 < v.size()) s += ",";
    }
    s += "]";
    return s;
}
static string toJson(const vector<string>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); ++i) {
        s += "\\"" + v[i] + "\\"";
        if (i + 1 < v.size()) s += ",";
    }
    s += "]";
    return s;
}

int main() {
    Solution solution;
    ${cases}
    return 0;
}
    `;
  }

  private static valueToCppLiteral(v: any): string {
    if (Array.isArray(v)) {
      if (v.length === 0) return 'vector<int>{}';
      if (typeof v[0] === 'number') {
        return `vector<int>{${v.join(',')}}`;
      }
      if (typeof v[0] === 'string') {
        const formatted = v.map((s: string) => `"${s}"`).join(',');
        return `vector<string>{${formatted}}`;
      }
      return `vector<int>{${v.join(',')}}`;
    }
    if (typeof v === 'string') return `string("${v}")`;
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return v.toString();
    return JSON.stringify(v);
  }

  private static runProcessWithStdin(exePath: string, stdinText: string = '', timeoutMs: number = 5000, maxBytes: number = 50 * 1024): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(exePath, [], { cwd: path.dirname(exePath), windowsHide: true });
      let stdout = '';
      let stderr = '';
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill('SIGKILL');
        reject(new Error('TIME_LIMIT_EXCEEDED'));
      }, timeoutMs);

      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        if (stdout.length > maxBytes) {
          killed = true;
          proc.kill('SIGKILL');
          clearTimeout(timer);
          reject(new Error('OUTPUT_LIMIT_EXCEEDED'));
        }
      });

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (!killed) {
          resolve({ stdout, stderr, code });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      if (stdinText) {
        proc.stdin.write(stdinText);
      }
      proc.stdin.end();
    });
  }

  static async runCCode(code: string, testCases: any[], functionName: string): Promise<JudgeResult> {
    const submissionId = crypto.randomUUID();
    const submissionDir = path.join(this.workspaceDir, submissionId);

    try {
      await fs.mkdir(submissionDir, { recursive: true });

      const hasMain = /\bint\s+main\b|\bmain\s*\(/.test(code);

      if (hasMain) {
        // Standard competitive programming stdin/stdout execution model
        await fs.writeFile(path.join(submissionDir, 'solution.c'), code);

        try {
          await execAsync('gcc -std=c11 -O2 solution.c -o solution.exe', {
            cwd: submissionDir,
            timeout: 8000
          });
        } catch (compileErr: any) {
          return {
            status: 'COMPILE_ERROR',
            message: compileErr.stderr || compileErr.stdout || compileErr.message || 'C Compilation Error',
            passedTests: 0,
            totalTests: testCases.length
          };
        }

        const caseResults: any[] = [];
        let passedCount = 0;
        let totalRuntime = 0.0;

        for (const [idx, tc] of testCases.entries()) {
          let stdinStr = '';
          if (typeof tc.input === 'object' && tc.input !== null) {
            stdinStr = Object.values(tc.input).map(v => Array.isArray(v) ? v.join(' ') : String(v)).join('\n') + '\n';
          } else {
            stdinStr = String(tc.input) + '\n';
          }

          let stdout = '';
          const t0 = performance.now();
          try {
            const res = await this.runProcessWithStdin(path.join(submissionDir, 'solution.exe'), stdinStr, 5000, 50 * 1024);
            if (res.code !== 0 && res.code !== null) {
              return {
                status: 'RUNTIME_ERROR',
                message: res.stderr || `Process exited with code ${res.code}`,
                passedTests: passedCount,
                totalTests: testCases.length
              };
            }
            stdout = res.stdout;
          } catch (runErr: any) {
            if (runErr.message === 'TIME_LIMIT_EXCEEDED') {
              return {
                status: 'TIME_LIMIT_EXCEEDED',
                message: 'Time Limit Exceeded: Execution exceeded 5 seconds',
                passedTests: passedCount,
                totalTests: testCases.length
              };
            }
            if (runErr.message === 'OUTPUT_LIMIT_EXCEEDED') {
              return {
                status: 'EXECUTION_ERROR',
                message: 'Output Limit Exceeded: Standard output exceeded 50 KB',
                passedTests: passedCount,
                totalTests: testCases.length
              };
            }
            return {
              status: 'RUNTIME_ERROR',
              message: runErr.message || 'C Runtime Crash',
              passedTests: passedCount,
              totalTests: testCases.length
            };
          }
          const t1 = performance.now();
          const elapsed = (t1 - t0) / 1000;
          totalRuntime += elapsed;

          const actualTrimmed = stdout.trim();
          const expectedTrimmed = String(tc.expectedOutput).trim();
          const passed = (actualTrimmed === expectedTrimmed);
          if (passed) passedCount++;

          caseResults.push({
            id: tc.id || idx + 1,
            isPublic: Boolean(tc.isPublic),
            expected: tc.expectedOutput,
            actual: actualTrimmed,
            passed,
            runtime: Math.round(elapsed * 10000) / 10000
          });
        }

        const finalStatus = passedCount === testCases.length ? 'ACCEPTED' : 'WRONG_ANSWER';
        return {
          status: finalStatus,
          passedTests: passedCount,
          totalTests: testCases.length,
          runtime: Math.round(totalRuntime * 10000) / 10000,
          message: finalStatus === 'WRONG_ANSWER' ? `Failed on test case ${passedCount + 1}` : undefined,
          results: caseResults
        };

      } else {
        // Function-based C execution model
        await fs.writeFile(path.join(submissionDir, 'solution.c'), code);
        const runnerCode = this.generateCRunner(functionName, testCases);
        await fs.writeFile(path.join(submissionDir, 'runner.c'), runnerCode);

        try {
          await execAsync('gcc -std=c11 -O2 runner.c -o runner.exe', {
            cwd: submissionDir,
            timeout: 8000
          });
        } catch (compileErr: any) {
          return {
            status: 'COMPILE_ERROR',
            message: compileErr.stderr || compileErr.stdout || compileErr.message || 'C Compilation Error',
            passedTests: 0,
            totalTests: testCases.length
          };
        }

        let stdout = '';
        try {
          const res = await this.runProcessWithStdin(path.join(submissionDir, 'runner.exe'), '', 5000, 50 * 1024);
          if (res.code !== 0 && res.code !== null) {
            return {
              status: 'RUNTIME_ERROR',
              message: res.stderr || `Runner process exited with code ${res.code}`,
              passedTests: 0,
              totalTests: testCases.length
            };
          }
          stdout = res.stdout;
        } catch (runErr: any) {
          if (runErr.message === 'TIME_LIMIT_EXCEEDED') {
            return {
              status: 'TIME_LIMIT_EXCEEDED',
              message: 'Time Limit Exceeded: Execution exceeded 5 seconds',
              passedTests: 0,
              totalTests: testCases.length
            };
          }
          return {
            status: 'RUNTIME_ERROR',
            message: runErr.message || 'C Runtime Crash',
            passedTests: 0,
            totalTests: testCases.length
          };
        }

        const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.startsWith('{'));
        const caseResults: any[] = [];
        let passedCount = 0;
        let totalRuntime = 0.0;

        for (const line of lines) {
          try {
            const item = JSON.parse(line);
            caseResults.push(item);
            if (item.passed) passedCount++;
            if (item.runtime) totalRuntime += item.runtime;
          } catch (e) {}
        }

        const finalStatus = passedCount === testCases.length ? 'ACCEPTED' : 'WRONG_ANSWER';
        return {
          status: finalStatus,
          passedTests: passedCount,
          totalTests: testCases.length,
          runtime: Math.round(totalRuntime * 10000) / 10000,
          message: finalStatus === 'WRONG_ANSWER' ? `Failed on test case ${passedCount + 1}` : undefined,
          results: caseResults
        };
      }

    } catch (err: any) {
      return {
        status: 'INTERNAL_ERROR',
        message: err.message || 'Internal Judge Service error',
        passedTests: 0,
        totalTests: testCases.length
      };
    } finally {
      try {
        await fs.rm(submissionDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  private static generateCRunner(functionName: string, testCases: any[]): string {
    const cases = testCases.map((tc, idx) => {
      let inputObj = tc.input;
      if (typeof inputObj === 'string') {
        try { inputObj = JSON.parse(inputObj); } catch (e) {}
      }
      let expectedObj = tc.expectedOutput;
      if (typeof expectedObj === 'string') {
        try { expectedObj = JSON.parse(expectedObj); } catch (e) {}
      }

      if (functionName === 'twoSum') {
        const nums = inputObj.nums || [];
        const target = inputObj.target || 0;
        const isPublicVal = Boolean(tc.isPublic) ? 1 : 0;
        const tcId = tc.id || idx + 1;
        const expected = JSON.stringify(expectedObj);
        return `
        {
          int nums[] = {${nums.join(',')}};
          int numsSize = ${nums.length};
          int target = ${target};
          int retSize = 0;
          clock_t t0 = clock();
          int* res = twoSum(nums, numsSize, target, &retSize);
          clock_t t1 = clock();
          double elapsed = (double)(t1 - t0) / CLOCKS_PER_SEC;
          char actualStr[64] = "[]";
          if (res != NULL && retSize >= 2) {
            int a = res[0] < res[1] ? res[0] : res[1];
            int b = res[0] < res[1] ? res[1] : res[0];
            snprintf(actualStr, sizeof(actualStr), "[%d,%d]", a, b);
            free(res);
          }
          const char* expectedStr = \"${expected}\";
          int passed = (strcmp(actualStr, expectedStr) == 0);
          printf("{\\"id\\":%d,\\"isPublic\\":%s,\\"expected\\":%s,\\"actual\\":%s,\\"passed\\":%s,\\"runtime\\":%f}\\n",
                 ${tcId}, BSTR(${isPublicVal}), expectedStr, actualStr, BSTR(passed), elapsed);
        }
        `;
      }

      if (functionName === 'maxSubArray') {
        const nums = inputObj.nums || [];
        const isPublicVal = Boolean(tc.isPublic) ? 1 : 0;
        const tcId = tc.id || idx + 1;
        return `
        {
          int nums[] = {${nums.join(',')}};
          int numsSize = ${nums.length};
          clock_t t0 = clock();
          int actualVal = maxSubArray(nums, numsSize);
          clock_t t1 = clock();
          double elapsed = (double)(t1 - t0) / CLOCKS_PER_SEC;
          int expectedVal = ${expectedObj};
          int passed = (actualVal == expectedVal);
          printf("{\\"id\\":%d,\\"isPublic\\":%s,\\"expected\\":%d,\\"actual\\":%d,\\"passed\\":%s,\\"runtime\\":%f}\\n",
                 ${tcId}, BSTR(${isPublicVal}), expectedVal, actualVal, BSTR(passed), elapsed);
        }
        `;
      }

      if (functionName === 'isValid') {
        const s = inputObj.s || "";
        const isPublicVal = Boolean(tc.isPublic) ? 1 : 0;
        const expectedIntVal = Boolean(expectedObj) ? 1 : 0;
        const tcId = tc.id || idx + 1;
        return `
        {
          char s[] = \"${s}\";
          clock_t t0 = clock();
          int actualVal = isValid(s);
          clock_t t1 = clock();
          double elapsed = (double)(t1 - t0) / CLOCKS_PER_SEC;
          int expectedVal = ${expectedIntVal};
          int passed = (actualVal == expectedVal);
          printf("{\\"id\\":%d,\\"isPublic\\":%s,\\"expected\\":%s,\\"actual\\":%s,\\"passed\\":%s,\\"runtime\\":%f}\\n",
                 ${tcId}, BSTR(${isPublicVal}), BSTR(expectedVal), BSTR(actualVal), BSTR(passed), elapsed);
        }
        `;
      }

      if (functionName === 'search') {
        const nums = inputObj.nums || [];
        const target = inputObj.target || 0;
        const isPublicVal = Boolean(tc.isPublic) ? 1 : 0;
        const tcId = tc.id || idx + 1;
        return `
        {
          int nums[] = {${nums.join(',')}};
          int numsSize = ${nums.length};
          int target = ${target};
          clock_t t0 = clock();
          int actualVal = search(nums, numsSize, target);
          clock_t t1 = clock();
          double elapsed = (double)(t1 - t0) / CLOCKS_PER_SEC;
          int expectedVal = ${expectedObj};
          int passed = (actualVal == expectedVal);
          printf("{\\"id\\":%d,\\"isPublic\\":%s,\\"expected\\":%d,\\"actual\\":%d,\\"passed\\":%s,\\"runtime\\":%f}\\n",
                 ${tcId}, BSTR(${isPublicVal}), expectedVal, actualVal, BSTR(passed), elapsed);
        }
        `;
      }

      return '';
    }).join('\n');

    return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define BSTR(b) ((b) ? \"true\" : \"false\")

#include \"solution.c\"

int main() {
    ${cases}
    return 0;
}
    `;
  }

}

JudgeService.init();
