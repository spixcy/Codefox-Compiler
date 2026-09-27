import fs from 'fs';

const filePath = 'frontend/src/data/problems.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace Two Sum
content = content.replace(
  /functionName: 'two_sum',\s*starterCode: `def two_sum\(nums, target\):\n    # Write your solution here\n    pass\n`,/g,
  `functionName: { python: 'two_sum', java: 'twoSum' },
    starterCode: {
      python: 'def two_sum(nums, target):\\n    # Write your solution here\\n    pass\\n',
      java: 'class Solution {\\n    public int[] twoSum(int[] nums, int target) {\\n        // Write your solution here\\n        return new int[]{};\\n    }\\n}'
    },`
);

// Replace Reverse String
content = content.replace(
  /functionName: 'reverse_string',\s*starterCode: `def reverse_string\(s\):\n    # Write your solution here\n    pass\n`,/g,
  `functionName: { python: 'reverse_string', java: 'reverseString' },
    starterCode: {
      python: 'def reverse_string(s):\\n    # Write your solution here\\n    pass\\n',
      java: 'class Solution {\\n    public String[] reverseString(String[] s) {\\n        // Write your solution here\\n        return new String[]{};\\n    }\\n}'
    },`
);

// Replace Valid Parentheses
content = content.replace(
  /functionName: 'is_valid',\s*starterCode: `def is_valid\(s\):\n    # Write your solution here\n    pass\n`,/g,
  `functionName: { python: 'is_valid', java: 'isValid' },
    starterCode: {
      python: 'def is_valid(s):\\n    # Write your solution here\\n    pass\\n',
      java: 'class Solution {\\n    public boolean isValid(String s) {\\n        // Write your solution here\\n        return false;\\n    }\\n}'
    },`
);

// Replace Maximum Subarray
content = content.replace(
  /functionName: 'max_sub_array',\s*starterCode: `def max_sub_array\(nums\):\n    # Write your solution here\n    pass\n`,/g,
  `functionName: { python: 'max_sub_array', java: 'maxSubArray' },
    starterCode: {
      python: 'def max_sub_array(nums):\\n    # Write your solution here\\n    pass\\n',
      java: 'class Solution {\\n    public int maxSubArray(int[] nums) {\\n        // Write your solution here\\n        return 0;\\n    }\\n}'
    },`
);

// Replace Binary Search
content = content.replace(
  /functionName: 'search',\s*starterCode: `def search\(nums, target\):\n    # Write your solution here\n    pass\n`,/g,
  `functionName: { python: 'search', java: 'search' },
    starterCode: {
      python: 'def search(nums, target):\\n    # Write your solution here\\n    pass\\n',
      java: 'class Solution {\\n    public int search(int[] nums, int target) {\\n        // Write your solution here\\n        return -1;\\n    }\\n}'
    },`
);

fs.writeFileSync(filePath, content);
console.log('Updated problems.ts with Java support');
