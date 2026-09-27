async function test() {
  // Test 1: Standard competitive programming C (Double Number with main & scanf/printf)
  const r1 = await fetch('http://localhost:3001/api/submissions/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      problemId: 6,
      language: 'c',
      code: '#include <stdio.h>\nint main() { int n; if (scanf("%d", &n) == 1) printf("%d\\n", n * 2); return 0; }',
      testCases: [
        { id: 1, input: { n: 5 }, expectedOutput: 10, isPublic: true },
        { id: 2, input: { n: 10 }, expectedOutput: 20, isPublic: true },
        { id: 3, input: { n: -5 }, expectedOutput: -10, isPublic: true }
      ],
      functionName: 'main'
    })
  }).then(r => r.json());

  // Test 2: Function-based C (Two Sum)
  const r2 = await fetch('http://localhost:3001/api/submissions/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      problemId: 1,
      language: 'c',
      code: '#include <stdio.h>\n#include <stdlib.h>\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) { *returnSize = 2; int* res = (int*)malloc(2*sizeof(int)); res[0]=0; res[1]=1; return res; }',
      testCases: [{ id: 1, input: { nums: [2, 7, 11, 15], target: 9 }, expectedOutput: [0, 1], isPublic: true }],
      functionName: 'twoSum'
    })
  }).then(r => r.json());

  console.log('Test 1 (Double Number - Stdin/Stdout):', r1.status, '| Passed:', r1.passedTests, '/', r1.totalTests);
  console.log('Test 2 (Two Sum - Function):', r2.status, '| Passed:', r2.passedTests, '/', r2.totalTests);
}

test().catch(console.error);
