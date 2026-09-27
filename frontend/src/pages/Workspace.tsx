import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Play, Send, CheckCircle2, XCircle, AlertTriangle, Clock, ChevronDown, RotateCcw } from 'lucide-react';
import { PROBLEMS_DATA, type Problem } from '../data/problems';
import { initPyodide } from '../services/pythonRunner';
import { initCheerpJ } from '../services/javaRunner';
import { executeCode, type SupportedLanguage } from '../services/executor';

// ── Language options ─────────────────────────────────────────────────────────

const LANGUAGES: { id: SupportedLanguage; label: string; monacoLang: string; engineDesc: string }[] = [
  { id: 'python', label: 'Python 3', monacoLang: 'python', engineDesc: 'Pyodide WebAssembly' },
  { id: 'java',   label: 'Java',     monacoLang: 'java',   engineDesc: 'OpenJDK 21 / CheerpJ' },
  { id: 'cpp',    label: 'C++ 17',   monacoLang: 'cpp',    engineDesc: 'GCC / G++ Engine' },
  { id: 'c',      label: 'C (C11)',  monacoLang: 'c',      engineDesc: 'GCC / C11 Engine' },
];

export default function Workspace() {
  const { slug } = useParams();
  const [problem, setProblem] = useState<Problem | null>(null);

  // Language state
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Per-language code buffer
  const [codeMap, setCodeMap] = useState<Record<SupportedLanguage, string>>({
    python: '',
    java: '',
    cpp: '',
    c: '',
  });

  // Engine status
  const [isJavaReady, setIsJavaReady] = useState(false);

  // Execution state
  const [activeTab, setActiveTab] = useState<'testcase' | 'result'>('testcase');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // ── Load Problem ──────────────────────────────────────────────────────────

  useEffect(() => {
    const found = PROBLEMS_DATA.find((p) => p.slug === slug);
    if (found) {
      setProblem(found);
      setCodeMap({
        python: found.starterCode.python,
        java:   found.starterCode.java,
        cpp:    found.starterCode.cpp,
        c:      found.starterCode.c,
      });
    }
  }, [slug]);

  // ── Initialise Engines ────────────────────────────────────────────────────

  const loadPythonEngine = useCallback(async () => {
    try {
      await initPyodide();
    } catch (e) {
      console.warn('Pyodide initialization note:', e);
    }
  }, []);

  const loadJavaEngine = useCallback(async () => {
    try {
      await initCheerpJ();
      setIsJavaReady(true);
    } catch (e) {
      console.warn('CheerpJ note (using local OpenJDK):', e);
      setIsJavaReady(true);
    }
  }, []);

  useEffect(() => {
    loadPythonEngine();
    loadJavaEngine();
  }, [loadPythonEngine, loadJavaEngine]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setShowLangMenu(false);
    setResult(null);
    if (lang === 'java' && !isJavaReady) {
      loadJavaEngine();
    }
  };

  const handleCodeChange = useCallback((val: string | undefined) => {
    setCodeMap(prev => ({ ...prev, [language]: val || '' }));
  }, [language]);

  const handleResetCode = () => {
    if (!problem) return;
    if (window.confirm(`Reset ${language.toUpperCase()} code back to the original starter template?`)) {
      setCodeMap(prev => ({
        ...prev,
        [language]: problem.starterCode[language]
      }));
    }
  };

  // ── Execute (Run / Submit) ─────────────────────────────────────────────────

  const runEvaluation = async (allTests: boolean) => {
    if (!problem) return;

    const publicTests = problem.testCases.filter(tc => tc.isPublic);
    const testsToRun  = allTests ? problem.testCases : publicTests;

    if (allTests) {
      setIsSubmitting(true);
      setResult({ status: 'JUDGING', message: `Evaluating solution on hidden & public test cases (${language.toUpperCase()})…` });
    } else {
      setIsRunning(true);
      setResult({ status: 'EXECUTING', message: `Running ${publicTests.length} public test cases (${language.toUpperCase()})…` });
    }
    setActiveTab('result');

    try {
      // For submit, if backend is reachable, invoke server submission
      if (allTests) {
        try {
          const submitResp = await fetch('http://localhost:3001/api/submissions/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              problemId: problem.id,
              language,
              code: codeMap[language],
              functionName: problem.functionName[language]
            }),
            signal: AbortSignal.timeout(10000)
          });
          if (submitResp.ok) {
            const data = await submitResp.json();
            setResult(data);
            return;
          }
        } catch (e) {
          // fallback to local execution
        }
      }

      // Execute code
      const evalResult = await executeCode({
        language,
        code: codeMap[language],
        testCases: testsToRun,
        functionName: problem.functionName[language],
      });
      setResult(evalResult);

    } catch (err: any) {
      setResult({
        status: 'INTERNAL_ERROR',
        message: err.message || 'Execution error occurred',
        passedTests: 0,
        totalTests: testsToRun.length,
      });
    } finally {
      setIsRunning(false);
      setIsSubmitting(false);
    }
  };

  if (!problem) return <div className="p-8 text-neutral-400">Problem not found</div>;

  const currentLang = LANGUAGES.find(l => l.id === language)!;

  // ── Header Status Helper ──────────────────────────────────────────────────

  const StatusHeader = () => {
    const s = result?.status;
    if (s === 'ACCEPTED') return <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2"><CheckCircle2 size={20}/> Accepted</h2>;
    if (s === 'WRONG_ANSWER') return <h2 className="text-xl font-bold text-rose-500 flex items-center gap-2"><XCircle size={20}/> Wrong Answer</h2>;
    if (s === 'TIME_LIMIT_EXCEEDED') return <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2"><Clock size={20}/> Time Limit Exceeded</h2>;
    if (s === 'COMPILE_ERROR') return <h2 className="text-xl font-bold text-orange-400 flex items-center gap-2"><AlertTriangle size={20}/> Compilation Error</h2>;
    if (s === 'RUNTIME_ERROR') return <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><AlertTriangle size={20}/> Runtime Error</h2>;
    if (s === 'EXECUTING' || s === 'JUDGING') return (
      <h2 className="text-xl font-bold text-neutral-300 flex items-center gap-2">
        <Clock size={20} className="animate-pulse text-amber-400"/> {result.message}
      </h2>
    );
    return <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><AlertTriangle size={20}/> {s}</h2>;
  };

  return (
    <div className="flex h-full w-full bg-neutral-950 overflow-hidden select-none">

      {/* ── LEFT PANEL: Problem Statement (40% width, full height) ── */}
      <div className="w-[40%] min-w-[340px] max-w-[520px] flex flex-col border-r border-neutral-800 bg-neutral-900 overflow-hidden shrink-0 select-text">
        <div className="h-11 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-5 shrink-0">
          <span className="font-semibold text-xs tracking-wider uppercase text-neutral-400">Problem Description</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {language === 'java' ? 'Java Ready' : language === 'cpp' ? 'C++ Ready' : 'Python Ready'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2.5">{problem.id}. {problem.title}</h1>
            <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
              problem.difficulty === 'Easy' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' :
              problem.difficulty === 'Medium' ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20' :
              'text-rose-400 bg-rose-400/10 border border-rose-400/20'
            }`}>
              {problem.difficulty}
            </span>
          </div>

          <div className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap">
            {problem.description}
          </div>

          {/* Examples */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">Examples</h3>
            <div className="space-y-3.5">
              {problem.examples.split(/\n\s*\n/).filter(b => b.trim()).map((block, idx) => {
                const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="font-semibold text-xs text-neutral-400">Example {idx + 1}:</div>
                    <div className="bg-neutral-950/80 border-l-2 border-orange-500/80 rounded-r p-3.5 font-mono text-xs text-neutral-300 space-y-1.5">
                      {lines.map((l, li) => {
                        if (l.startsWith('Input:')) return <div key={li}><span className="font-bold text-neutral-400 font-sans mr-1.5">Input:</span><span className="text-neutral-200">{l.replace(/^Input:\s*/, '')}</span></div>;
                        if (l.startsWith('Output:')) return <div key={li}><span className="font-bold text-neutral-400 font-sans mr-1.5">Output:</span><span className="text-emerald-400 font-semibold">{l.replace(/^Output:\s*/, '')}</span></div>;
                        if (l.startsWith('Explanation:')) return <div key={li} className="font-sans text-neutral-400 text-xs mt-1.5 pt-1.5 border-t border-neutral-800/80"><span className="font-semibold text-neutral-300 mr-1.5">Explanation:</span>{l.replace(/^Explanation:\s*/, '')}</div>;
                        return <div key={li}>{l}</div>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Constraints */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-2.5">Constraints:</h3>
            <ul className="space-y-2">
              {problem.constraints.split('\n').map(l => l.trim()).filter(Boolean).map((line, idx) => {
                const formatted = line.replace(/\^(\d+)/g, (_, e) =>
                  e.split('').map((d: string) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)] || d).join('')
                );
                const hasCode = /[<=><_\[\]]/.test(formatted);
                return (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                    {hasCode
                      ? <code className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-200 tracking-tight">{formatted}</code>
                      : <span className="text-neutral-300 text-xs leading-relaxed">{formatted}</span>
                    }
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Code Editor & Bottom Console (60% width, full height) ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-950">

        {/* ── Action Toolbar ── */}
        <div className="h-11 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 shrink-0">
          
          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(v => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700/80 px-3 py-1.5 rounded border border-neutral-700/60 transition-colors"
              >
                <span>{currentLang.label}</span>
                <span className="text-[10px] text-neutral-400 font-normal">({currentLang.engineDesc})</span>
                <ChevronDown size={13} className={`text-neutral-400 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>

              {showLangMenu && (
                <div className="absolute top-10 left-0 z-50 bg-neutral-800 border border-neutral-700 rounded-md shadow-2xl overflow-hidden min-w-[220px]">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => handleLanguageChange(lang.id)}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between
                        ${language === lang.id ? 'bg-orange-500/15 text-orange-400 font-semibold' : 'text-neutral-300 hover:bg-neutral-700/60'}`}
                    >
                      <div className="flex flex-col">
                        <span>{lang.label}</span>
                        <span className="text-[10px] text-neutral-400">{lang.engineDesc}</span>
                      </div>
                      {language === lang.id && <span className="text-orange-500">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Code Button */}
            <button
              onClick={handleResetCode}
              title="Reset Code Template"
              className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors text-xs flex items-center gap-1"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline text-[11px]">Reset</span>
            </button>
          </div>

          {/* Run & Submit Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => runEvaluation(false)}
              disabled={isRunning || isSubmitting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            >
              <Play size={13} className={isRunning ? 'animate-spin text-green-400' : 'text-green-400 fill-green-400/20'} />
              <span>{isRunning ? 'Running…' : 'Run'}</span>
            </button>

            <button
              onClick={() => runEvaluation(true)}
              disabled={isRunning || isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Send size={13} className={isSubmitting ? 'animate-pulse' : ''} />
              <span>{isSubmitting ? 'Judging…' : 'Submit'}</span>
            </button>
          </div>
        </div>

        {/* ── Monaco Code Editor (Fills vertical area) ── */}
        <div className="flex-1 min-h-[300px] relative w-full bg-[#1e1e1e]">
          <Editor
            height="100%"
            width="100%"
            language={currentLang.monacoLang}
            theme="vs-dark"
            value={codeMap[language]}
            onChange={handleCodeChange}
            options={{
              minimap: { enabled: false },
              fontSize: 13.5,
              lineHeight: 1.55,
              fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
              padding: { top: 14, bottom: 14 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              formatOnPaste: true,
              automaticLayout: true,
            }}
          />
        </div>

        {/* ── Console / Test Results Panel (Fixed comfortable height) ── */}
        <div className="h-72 flex flex-col bg-neutral-900 border-t border-neutral-800 shrink-0 select-text">
          <div className="h-10 bg-neutral-900 border-b border-neutral-800 flex items-center px-4 gap-6 shrink-0">
            {(['testcase', 'result'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-semibold uppercase tracking-wider transition-colors h-full flex items-center border-b-2
                  ${activeTab === tab ? 'text-white border-orange-500' : 'text-neutral-400 border-transparent hover:text-neutral-200'}`}
              >
                {tab === 'testcase' ? 'Testcases' : 'Test Result'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Testcases Tab */}
            {activeTab === 'testcase' && (
              <div className="space-y-3">
                {problem.testCases.filter(t => t.isPublic).map((tc, idx) => (
                  <div key={tc.id} className="bg-neutral-950 rounded border border-neutral-800 p-3 font-mono text-xs">
                    <div className="text-[11px] text-neutral-400 font-sans font-semibold mb-2">Case {idx + 1}</div>
                    <div className="space-y-1.5 text-neutral-300">
                      <div>
                        <span className="text-neutral-400 font-sans mr-2">Input:</span>
                        <span className="text-neutral-100">{JSON.stringify(tc.input)}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 font-sans mr-2">Expected:</span>
                        <span className="text-emerald-400 font-semibold">{JSON.stringify(tc.expectedOutput)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Test Result Tab */}
            {activeTab === 'result' && (
              <div className="h-full">
                {!result ? (
                  <div className="flex items-center justify-center h-full text-neutral-400 text-xs">
                    Click <span className="font-semibold text-neutral-300 mx-1">Run</span> to evaluate public test cases or <span className="font-semibold text-neutral-300 mx-1">Submit</span> for all tests.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <StatusHeader />

                    {/* Stats Summary */}
                    {result.status !== 'EXECUTING' && result.status !== 'JUDGING' && (
                      <div className="flex gap-8 text-xs bg-neutral-950 p-3 rounded border border-neutral-800">
                        <div className="flex flex-col">
                          <span className="text-neutral-400">Test Cases Passed</span>
                          <span className="text-white font-mono font-bold text-sm">{result.passedTests} / {result.totalTests}</span>
                        </div>
                        {result.runtime != null && (
                          <div className="flex flex-col">
                            <span className="text-neutral-400">Runtime</span>
                            <span className="text-white font-mono font-bold text-sm">{result.runtime}s</span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-neutral-400">Language</span>
                          <span className="text-neutral-200 font-mono text-sm uppercase">{language}</span>
                        </div>
                      </div>
                    )}

                    {/* Error / Compiler / Traceback Message */}
                    {result.message && result.status !== 'EXECUTING' && result.status !== 'JUDGING' && (
                      <div className="bg-neutral-950 border border-neutral-800 rounded p-3.5 font-mono text-xs text-rose-400 whitespace-pre-wrap leading-relaxed">
                        {result.message}
                      </div>
                    )}

                    {/* Per Test-case Breakdown */}
                    {result.results && result.results.length > 0 && (
                      <div className="space-y-2">
                        {result.results.map((c: any, i: number) => (
                          <div key={i} className="bg-neutral-950 p-3 rounded border border-neutral-800 text-xs font-mono">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-neutral-400">
                                Case #{c.id || i + 1} {c.isPublic ? '(Public)' : '(Hidden)'}
                              </span>
                              <span className={c.passed ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                {c.passed ? '✓ PASSED' : '✕ FAILED'}
                              </span>
                            </div>
                            {!c.passed && (
                              <div className="space-y-1 text-neutral-300 mt-2 pt-2 border-t border-neutral-800">
                                {c.expected !== undefined && (
                                  <div>Expected: <span className="text-emerald-400 font-semibold">{JSON.stringify(c.expected)}</span></div>
                                )}
                                {c.actual !== undefined && (
                                  <div>Your Output: <span className="text-rose-400 font-semibold">{JSON.stringify(c.actual)}</span></div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
