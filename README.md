# CodeForge — Multi-Language Competitive Programming Platform

A **LeetCode-style coding platform** that executes code **locally on the user's machine** (no Judge0, no cloud sandboxes for RUN) and uses its own judge engine for submission verdicts.

---

## ✨ What It Is

CodeForge is a full-stack competitive programming platform where users can:

- Browse problems and solve them in **Python, Java, C++, or C**
- **Run** code instantly against public test cases — executed **locally** (no round-trip to a remote judge for every run)
- **Submit** solutions to be evaluated against all test cases by an isolated server-side judge

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite + React)                  │
│                                                                  │
│  ProblemList  ──→  Workspace (Monaco Editor + Results Panel)     │
│                         │                                        │
│              ┌──────────┴──────────┐                             │
│              │   executor.ts       │  (unified router)           │
│              └──┬────┬────┬────┬───┘                             │
│                 │    │    │    │                                 │
│           python│  java│  cpp│   c│                              │
│                 ▼    ▼    ▼    ▼                                 │
│         pythonRunner  javaRunner  cppRunner  cRunner             │
│              │         │              │          │               │
│         Pyodide      CherrypJ   Emscripten  Emscripten           │
│         (WASM)      local JVM     HTTP POST  HTTP POST           │
└──────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┘
                    ▼
┌───────────────────────────────────────────────────────┐
│                  BACKEND (Express + tsx)              │
│                     Port 3001                         │
│                                                       │
│   POST /api/submissions/run    ──→  JudgeService      │
│   POST /api/submissions/submit ──→  JudgeService      │
│   POST /api/compile            ──→  javac fallback    │
│                                                       │
│   JudgeService                                        │
│   ├── runPythonCode  (Python 3 via system python)     │
│   ├── runJavaCode    (javac + java, OpenJDK 21)       │
│   ├── runCppCode     (g++ -std=c++14 -O2)             │
│   └── runCCode       (gcc -std=c11 -O2)               │
│         ├── Path A: stdin/stdout (int main present)   │
│         └── Path B: function harness (auto-generated) │
│                                                       │
│   Database: SQLite via Prisma                         │
│   Temp files: ./temp_workspace/<uuid>/                │
└───────────────────────────────────────────────────────┘
```

---

## 🚀 Language Execution Model

### RUN (local, instant)

| Language | Execution Engine | Mode |
|----------|-----------------|------|
| **Python 3** | Pyodide (WebAssembly) | Runs fully in-browser, zero backend calls |
| **Java** | Local OpenJDK 21 (via backend) | Compiles + runs with `javac`/`java` |
| **C++ 17** | Local GCC/G++ (via backend) | Compiles with `g++ -std=c++14 -O2` |
| **C (C11)** | Local GCC (via backend) | Compiles with `gcc -std=c11 -O2` |

> **Python runs 100% offline in the browser** via Pyodide WASM — no backend needed for run.  
> **Java/C++/C** compile and execute on the local machine's backend service (localhost:3001).

### SUBMIT

All languages submit to the backend's `JudgeService`, which runs the solution against all test cases (including hidden ones) inside an isolated subprocess with stdout/stderr capture and a 5-second TLE guard.

---

## 📁 Project Structure

```
compiler/
├── frontend/                        # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ProblemList.tsx      # Problem browser
│   │   │   └── Workspace.tsx        # Main editor + results UI
│   │   ├── services/
│   │   │   ├── executor.ts          # Unified language router
│   │   │   ├── pythonRunner.ts      # Python via Pyodide WASM
│   │   │   ├── javaRunner.ts        # Java via local OpenJDK / CheerpJ
│   │   │   ├── cppRunner.ts         # C++ via backend GCC
│   │   │   └── cRunner.ts           # C via backend GCC
│   │   ├── data/
│   │   │   └── problems.ts          # Problem definitions + test cases + starter code
│   │   └── workers/
│   │       └── pythonWorker.ts      # Web Worker for Pyodide isolation
│   └── public/
│       └── pyodide/                 # Pyodide WASM runtime (Python in-browser)
│
├── backend/                         # Express.js API + Judge Engine
│   ├── src/
│   │   ├── index.ts                 # Express server, API routes
│   │   └── judge/
│   │       └── JudgeService.ts      # Core compiler/runner logic for all 4 languages
│   └── prisma/
│       ├── schema.prisma            # Database schema (Problems, Submissions)
│       └── dev.db                   # SQLite database
│
└── judge-service/                   # (Legacy/Docker) Isolated Python runner
    └── execution/docker/
        ├── Dockerfile
        └── runner.py
```

---

## ⚙️ How the C/C++ Judge Works

Both C and C++ support **two execution modes** determined automatically:

**Mode A — stdin/stdout** (competitive programming style)  
If the submitted code contains `int main(`, the entire program is compiled and executed directly. Test case inputs are piped via stdin; expected output is compared with stdout.

```c
// Example: user writes this, main() is detected → stdin/stdout mode
#include <stdio.h>
int main() {
    int n;
    scanf("%d", &n);
    printf("%d\n", n * 2);
    return 0;
}
```

**Mode B — function harness** (LeetCode style)  
If no `main()` is detected, the `JudgeService` auto-generates a C/C++ harness that:
1. `#include`s the user's solution file
2. Sets up test case inputs as stack variables
3. Calls the user's function
4. Uses `printf` to emit JSON result lines parsed back by Node.js

```c
// Example: user writes a function → harness is auto-generated around it
int* twoSum(int* nums, int numsSize, int target, int* returnSize) { ... }
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + TypeScript + Vite |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Python execution | Pyodide (CPython compiled to WebAssembly) |
| Java execution | Local OpenJDK 21 (`javac` / `java`) |
| C/C++ execution | MinGW GCC (`gcc` / `g++`) |
| Backend runtime | Node.js v24 + `tsx` |
| API framework | Express.js |
| Database | SQLite via Prisma ORM |
| Styling | Tailwind CSS |

---

## 🔧 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **GCC/G++** (MinGW on Windows, or system gcc on Linux/macOS)
- **Java (JDK 21)** — for Java problems
- **Python 3** — optional, Pyodide runs in-browser without it

### 1. Backend

```bash
cd backend
npm install
npx prisma generate
npx tsx src/index.ts
# → Server is running on port 3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 📝 Adding a New Problem

Edit [`frontend/src/data/problems.ts`](frontend/src/data/problems.ts) and add a new entry:

```typescript
{
  id: 7,
  slug: 'my-problem',
  title: 'My Problem',
  difficulty: 'Easy',
  description: 'Problem statement here...',
  functionName: { python: 'myFunc', java: 'myFunc', cpp: 'myFunc', c: 'myFunc' },
  starterCode: {
    python: `def myFunc(n: int) -> int:\n    pass`,
    java:   `public int myFunc(int n) {\n    return 0;\n}`,
    cpp:    `int myFunc(int n) {\n    return 0;\n}`,
    c:      `int myFunc(int n) {\n    return 0;\n}`,
  },
  testCases: [
    { id: 1, input: { n: 5 }, expectedOutput: 10, isPublic: true },
    { id: 2, input: { n: 0 }, expectedOutput: 0, isPublic: false },
  ],
}
```

> For stdin/stdout problems (competitive style), write `main()` in the starter code — the judge auto-detects the mode.

---

## 🔒 Design Decisions

- **No Judge0** — all code execution goes through the local `JudgeService` (backend) or Pyodide (Python). No third-party judge APIs.
- **Hidden test cases never leave the server** — only public test cases are visible to users during RUN.
- **Sandboxing** — each submission runs in an isolated `temp_workspace/<uuid>/` directory, cleaned up after execution.
- **TLE protection** — all processes are killed after 5 seconds via Node.js `spawn` with a timeout.
- **OLE protection** — stdout is capped at 50 KB to prevent output flooding.
