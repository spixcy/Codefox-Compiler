export interface TestCase {
  id: number;
  input: Record<string, any>;
  expectedOutput: any;
  isPublic: boolean;
  order: number;
}

export interface Problem {
  id: number;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  examples: string;
  functionName: { python: string; java: string; cpp: string; c: string };
  starterCode: { python: string; java: string; cpp: string; c: string };
  testCases: TestCase[];
}

export const PROBLEMS_DATA: Problem[] = [
  {
    id: 1,
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'Easy',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
    inputFormat: 'nums: List[int], target: int',
    outputFormat: 'List[int]',
    examples: 'Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].',
    functionName: { python: 'two_sum', java: 'twoSum', cpp: 'twoSum', c: 'twoSum' },
    starterCode: {
      python: 'def two_sum(nums, target):\n    # Write your solution here\n    pass\n',
      java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}',
      cpp: '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n        return {};\n    }\n};',
      c: '#include <stdio.h>\n#include <stdlib.h>\n\n/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    *returnSize = 2;\n    int* res = (int*)malloc(2 * sizeof(int));\n    // Write your solution here\n    res[0] = 0; res[1] = 1;\n    return res;\n}'
    },
    testCases: [
      {
        id: 1,
        input: { nums: [2, 7, 11, 15], target: 9 },
        expectedOutput: [0, 1],
        isPublic: true,
        order: 1,
      },
      {
        id: 2,
        input: { nums: [3, 2, 4], target: 6 },
        expectedOutput: [1, 2],
        isPublic: true,
        order: 2,
      },
      {
        id: 3,
        input: { nums: [3, 3], target: 6 },
        expectedOutput: [0, 1],
        isPublic: false,
        order: 3,
      }
    ]
  },
  {
    id: 2,
    title: 'Reverse String',
    slug: 'reverse-string',
    difficulty: 'Easy',
    description: 'Write a function that reverses a list of characters.\n\nReturn the reversed list.',
    constraints: '1 <= s.length <= 10^5\ns[i] is a printable ascii character.',
    inputFormat: 's: List[str]',
    outputFormat: 'List[str]',
    examples: 'Input: s = ["h","e","l","l","o"]\nOutput: ["o","l","l","e","h"]',
    functionName: { python: 'reverse_string', java: 'reverseString', cpp: 'reverseString', c: 'reverseString' },
    starterCode: {
      python: 'def reverse_string(s):\n    # Write your solution here\n    pass\n',
      java: 'class Solution {\n    public String[] reverseString(String[] s) {\n        // Write your solution here\n        return new String[]{};\n    }\n}',
      cpp: '#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<string> reverseString(vector<string>& s) {\n        // Write your solution here\n        return {};\n    }\n};',
      c: '#include <stdio.h>\n#include <string.h>\n\nvoid reverseString(char* s, int sSize) {\n    // Write your solution here\n}'
    },
    testCases: [
      {
        id: 1,
        input: { s: ["h", "e", "l", "l", "o"] },
        expectedOutput: ["o", "l", "l", "e", "h"],
        isPublic: true,
        order: 1,
      },
      {
        id: 2,
        input: { s: ["H", "a", "n", "n", "a", "h"] },
        expectedOutput: ["h", "a", "n", "n", "a", "H"],
        isPublic: false,
        order: 2,
      }
    ]
  },
  {
    id: 3,
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    difficulty: 'Easy',
    description: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.\n\nAn input string is valid if open brackets are closed in the correct order and with matching bracket types.',
    constraints: '1 <= s.length <= 10^4\ns consists of parentheses only "()[]{}"',
    inputFormat: 's: str',
    outputFormat: 'bool',
    examples: 'Input: s = "()"\nOutput: True\n\nInput: s = "()[]{}"\nOutput: True\n\nInput: s = "(]"\nOutput: False',
    functionName: { python: 'is_valid', java: 'isValid', cpp: 'isValid', c: 'isValid' },
    starterCode: {
      python: 'def is_valid(s):\n    # Write your solution here\n    pass\n',
      java: 'class Solution {\n    public boolean isValid(String s) {\n        // Write your solution here\n        return false;\n    }\n}',
      cpp: '#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        // Write your solution here\n        return false;\n    }\n};',
      c: '#include <stdbool.h>\n#include <string.h>\n\nbool isValid(char* s) {\n    // Write your solution here\n    return false;\n}'
    },
    testCases: [
      {
        id: 1,
        input: { s: "()" },
        expectedOutput: true,
        isPublic: true,
        order: 1,
      },
      {
        id: 2,
        input: { s: "()[]{}" },
        expectedOutput: true,
        isPublic: true,
        order: 2,
      },
      {
        id: 3,
        input: { s: "(]" },
        expectedOutput: false,
        isPublic: true,
        order: 3,
      },
      {
        id: 4,
        input: { s: "([)]" },
        expectedOutput: false,
        isPublic: false,
        order: 4,
      }
    ]
  },
  {
    id: 4,
    title: 'Maximum Subarray',
    slug: 'maximum-subarray',
    difficulty: 'Medium',
    description: 'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    inputFormat: 'nums: List[int]',
    outputFormat: 'int',
    examples: 'Input: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.',
    functionName: { python: 'max_sub_array', java: 'maxSubArray', cpp: 'maxSubArray', c: 'maxSubArray' },
    starterCode: {
      python: 'def max_sub_array(nums):\n    # Write your solution here\n    pass\n',
      java: 'class Solution {\n    public int maxSubArray(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}',
      cpp: '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Write your solution here\n        return 0;\n    }\n};',
      c: '#include <stdio.h>\n\nint maxSubArray(int* nums, int numsSize) {\n    // Write your solution here\n    return 0;\n}'
    },
    testCases: [
      {
        id: 1,
        input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
        expectedOutput: 6,
        isPublic: true,
        order: 1,
      },
      {
        id: 2,
        input: { nums: [1] },
        expectedOutput: 1,
        isPublic: true,
        order: 2,
      },
      {
        id: 3,
        input: { nums: [5, 4, -1, 7, 8] },
        expectedOutput: 23,
        isPublic: false,
        order: 3,
      }
    ]
  },
  {
    id: 5,
    title: 'Binary Search',
    slug: 'binary-search',
    difficulty: 'Easy',
    description: 'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, return its index. Otherwise, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.',
    constraints: '1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll the integers in nums are unique.\nnums is sorted in ascending order.',
    inputFormat: 'nums: List[int], target: int',
    outputFormat: 'int',
    examples: 'Input: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4\nExplanation: 9 exists in nums and its index is 4',
    functionName: { python: 'search', java: 'search', cpp: 'search', c: 'search' },
    starterCode: {
      python: 'def search(nums, target):\n    # Write your solution here\n    pass\n',
      java: 'class Solution {\n    public int search(int[] nums, int target) {\n        // Write your solution here\n        return -1;\n    }\n}',
      cpp: '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        // Write your solution here\n        return -1;\n    }\n};',
      c: '#include <stdio.h>\n\nint search(int* nums, int numsSize, int target) {\n    // Write your solution here\n    return -1;\n}'
    },
    testCases: [
      {
        id: 1,
        input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 },
        expectedOutput: 4,
        isPublic: true,
        order: 1,
      },
      {
        id: 2,
        input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 },
        expectedOutput: -1,
        isPublic: true,
        order: 2,
      },
      {
        id: 3,
        input: { nums: [5], target: -5 },
        expectedOutput: -1,
        isPublic: false,
        order: 3,
      }
    ]
  },
  {
    id: 6,
    title: 'Double the Number',
    slug: 'double-the-number',
    difficulty: 'Easy',
    description: 'Read an integer from standard input, double it, and print the result to standard output.\n\nThis problem tests standard competitive-programming stdin/stdout execution in C, C++, Python, and Java.',
    constraints: '-10^9 <= n <= 10^9',
    inputFormat: 'n: int via stdin',
    outputFormat: 'int via stdout',
    examples: 'Input: 5\nOutput: 10\n\nInput: 10\nOutput: 20\n\nInput: -5\nOutput: -10',
    functionName: { python: 'double_number', java: 'doubleNumber', cpp: 'doubleNumber', c: 'main' },
    starterCode: {
      python: 'import sys\n\ndef main():\n    line = sys.stdin.read().strip()\n    if line:\n        n = int(line)\n        print(n * 2)\n\nif __name__ == "__main__":\n    main()\n',
      java: 'import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (scanner.hasNextInt()) {\n            int n = scanner.nextInt();\n            System.out.println(n * 2);\n        }\n    }\n}',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    if (cin >> n) {\n        cout << n * 2 << endl;\n    }\n    return 0;\n}',
      c: '#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        printf("%d\\n", n * 2);\n    }\n    return 0;\n}'
    },
    testCases: [
      {
        id: 1,
        input: { n: 5 },
        expectedOutput: 10,
        isPublic: true,
        order: 1,
      },
      {
        id: 2,
        input: { n: 10 },
        expectedOutput: 20,
        isPublic: true,
        order: 2,
      },
      {
        id: 3,
        input: { n: -5 },
        expectedOutput: -10,
        isPublic: true,
        order: 3,
      },
      {
        id: 4,
        input: { n: 100 },
        expectedOutput: 200,
        isPublic: false,
        order: 4,
      }
    ]
  }
];
