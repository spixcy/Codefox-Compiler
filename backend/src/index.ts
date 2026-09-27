import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { JudgeService } from './judge/JudgeService';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

dotenv.config();

const app = express();
let prisma: any = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (e) {
  console.log('Prisma client not available, running in memory-mode');
}

const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '100kb' }));

// API Routes

/**
 * POST /api/compile
 * Compiles Java source code server-side using javac and returns the
 * base64-encoded .class bytecode files.
 * This is ONLY used if the client-side CheerpJ compilation fails.
 * Hidden test cases are NEVER sent to the client.
 */
app.post('/api/compile', async (req, res) => {
  const { code, className = 'Solution' } = req.body as { code: string; className?: string };
  if (!code) return res.status(400).json({ error: 'No code provided' });

  const workId = crypto.randomUUID();
  const workDir = path.join(process.cwd(), 'temp_workspace', workId);

  try {
    await fs.mkdir(workDir, { recursive: true });
    await fs.writeFile(path.join(workDir, `${className}.java`), code);

    const { stderr } = await execAsync(`javac ${className}.java`, {
      cwd: workDir,
      timeout: 10_000,
    });

    if (stderr) {
      return res.json({ status: 'COMPILE_ERROR', message: stderr });
    }

    // Return all .class files as base64 map: { "Solution.class": "<base64>" }
    const classFiles = (await fs.readdir(workDir)).filter(f => f.endsWith('.class'));
    const classes: Record<string, string> = {};
    for (const file of classFiles) {
      const buf = await fs.readFile(path.join(workDir, file));
      classes[file] = buf.toString('base64');
    }

    return res.json({ status: 'OK', classes });
  } catch (err: any) {
    if (err.killed) return res.json({ status: 'COMPILE_ERROR', message: 'Compilation timed out' });
    return res.json({ status: 'COMPILE_ERROR', message: err.stderr || err.message });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
});

// Get all problems
app.get('/api/problems', async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
      },
    });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get problem by ID or slug
app.get('/api/problems/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isId = !isNaN(Number(idOrSlug));
    
    const problem = await prisma.problem.findFirst({
      where: isId ? { id: Number(idOrSlug) } : { slug: idOrSlug },
      include: {
        testCases: {
          where: { isPublic: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(problem);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Run submission (Public tests only)
app.post('/api/submissions/run', async (req, res) => {
  try {
    const { problemId, code, language = 'python', testCases: customTestCases, functionName: customFunctionName } = req.body;
    
    let testCases = customTestCases;
    let functionName = customFunctionName;

    if (!testCases || !functionName) {
      const problem = await prisma.problem.findUnique({
        where: { id: Number(problemId) },
        include: { testCases: { where: { isPublic: true } } }
      });
      if (!problem) return res.status(404).json({ error: 'Problem not found' });
      testCases = problem.testCases;
      functionName = problem.functionName || 'two_sum';
    }

    let result;
    if (language === 'java') {
      result = await JudgeService.runJavaCode(code, testCases, functionName);
    } else if (language === 'cpp') {
      result = await JudgeService.runCppCode(code, testCases, functionName);
    } else if (language === 'c') {
      result = await JudgeService.runCCode(code, testCases, functionName);
    } else {
      result = await JudgeService.runPythonCode(code, testCases, functionName);
    }
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit submission (All tests, including hidden)
app.post('/api/submissions/submit', async (req, res) => {
  try {
    const { problemId, code, language = 'python', functionName: customFunctionName } = req.body;
    
    let problemTestCases = [];
    let functionName = customFunctionName;

    if (prisma) {
      const problem = await prisma.problem.findUnique({
        where: { id: Number(problemId) },
        include: { testCases: true } // All test cases including hidden
      });
      if (problem) {
        problemTestCases = problem.testCases;
        if (!functionName) functionName = problem.functionName || 'two_sum';
      }
    }

    if (!problemTestCases.length) {
      // In-memory problem test cases fallback
      const { PROBLEMS_DATA } = require('../../frontend/src/data/problems');
      const p = PROBLEMS_DATA.find((x: any) => x.id === Number(problemId));
      if (p) {
        problemTestCases = p.testCases;
        if (!functionName) functionName = p.functionName[language] || 'twoSum';
      }
    }

    let result;
    if (language === 'java') {
      result = await JudgeService.runJavaCode(code, problemTestCases, functionName);
    } else if (language === 'cpp') {
      result = await JudgeService.runCppCode(code, problemTestCases, functionName);
    } else if (language === 'c') {
      result = await JudgeService.runCCode(code, problemTestCases, functionName);
    } else {
      result = await JudgeService.runPythonCode(code, problemTestCases, functionName);
    }
    
    let submission: any = {
      id: Date.now(),
      problemId: Number(problemId),
      code,
      language,
      status: result.status,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      runtime: result.runtime,
      memory: result.memory,
      message: result.message
    };

    if (prisma) {
      try {
        submission = await prisma.submission.create({
          data: submission
        });
      } catch (e) {}
    }

    res.json({
      ...submission,
      message: result.message,
      results: result.results?.filter((r: any) => r.isPublic)
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get submissions for a problem
app.get('/api/problems/:id/submissions', async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { problemId: Number(req.params.id) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
