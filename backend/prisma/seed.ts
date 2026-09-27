import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Problem 1: Two Sum
  const twoSum = await prisma.problem.create({
    data: {
      title: 'Two Sum',
      slug: 'two-sum',
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
      difficulty: 'Easy',
      constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
      inputFormat: 'nums: List[int], target: int',
      outputFormat: 'List[int]',
      examples: 'Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].',
      functionName: 'two_sum',
      starterCode: 'def two_sum(nums, target):\n    # Write your solution here\n    pass\n',
      testCases: {
        create: [
          {
            input: '{"nums": [2,7,11,15], "target": 9}',
            expectedOutput: '[0, 1]',
            isPublic: true,
            order: 1,
          },
          {
            input: '{"nums": [3,2,4], "target": 6}',
            expectedOutput: '[1, 2]',
            isPublic: true,
            order: 2,
          },
          {
            input: '{"nums": [3,3], "target": 6}',
            expectedOutput: '[0, 1]',
            isPublic: false,
            order: 3,
          }
        ]
      }
    }
  });

  // Problem 2: Reverse String
  const reverseString = await prisma.problem.create({
    data: {
      title: 'Reverse String',
      slug: 'reverse-string',
      description: 'Write a function that reverses a string. The input string is given as an array of characters s.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.',
      difficulty: 'Easy',
      constraints: '1 <= s.length <= 10^5\ns[i] is a printable ascii character.',
      inputFormat: 's: List[str]',
      outputFormat: 'List[str]',
      examples: 'Input: s = ["h","e","l","l","o"]\nOutput: ["o","l","l","e","h"]',
      functionName: 'reverse_string',
      starterCode: 'def reverse_string(s):\n    # Write your solution here\n    pass\n',
      testCases: {
        create: [
          {
            input: '{"s": ["h","e","l","l","o"]}',
            expectedOutput: '["o","l","l","e","h"]',
            isPublic: true,
            order: 1,
          },
          {
            input: '{"s": ["H","a","n","n","a","h"]}',
            expectedOutput: '["h","a","n","n","a","H"]',
            isPublic: false,
            order: 2,
          }
        ]
      }
    }
  });

  // Problem 3: Valid Parentheses
  const validParentheses = await prisma.problem.create({
    data: {
      title: 'Valid Parentheses',
      slug: 'valid-parentheses',
      description: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
      difficulty: 'Easy',
      constraints: '1 <= s.length <= 10^4\ns consists of parentheses only "()[]{}"',
      inputFormat: 's: str',
      outputFormat: 'bool',
      examples: 'Input: s = "()"\nOutput: true\n\nInput: s = "()[]{}"\nOutput: true\n\nInput: s = "(]"\nOutput: false',
      functionName: 'is_valid',
      starterCode: 'def is_valid(s):\n    # Write your solution here\n    pass\n',
      testCases: {
        create: [
          {
            input: '{"s": "()"}',
            expectedOutput: 'true',
            isPublic: true,
            order: 1,
          },
          {
            input: '{"s": "()[]{}"}',
            expectedOutput: 'true',
            isPublic: true,
            order: 2,
          },
          {
            input: '{"s": "(]"}',
            expectedOutput: 'false',
            isPublic: true,
            order: 3,
          },
          {
            input: '{"s": "([)]"}',
            expectedOutput: 'false',
            isPublic: false,
            order: 4,
          }
        ]
      }
    }
  });

  // Problem 4: Maximum Subarray
  const maxSubarray = await prisma.problem.create({
    data: {
      title: 'Maximum Subarray',
      slug: 'maximum-subarray',
      description: 'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
      difficulty: 'Medium',
      constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
      inputFormat: 'nums: List[int]',
      outputFormat: 'int',
      examples: 'Input: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.',
      functionName: 'max_sub_array',
      starterCode: 'def max_sub_array(nums):\n    # Write your solution here\n    pass\n',
      testCases: {
        create: [
          {
            input: '{"nums": [-2,1,-3,4,-1,2,1,-5,4]}',
            expectedOutput: '6',
            isPublic: true,
            order: 1,
          },
          {
            input: '{"nums": [1]}',
            expectedOutput: '1',
            isPublic: true,
            order: 2,
          },
          {
            input: '{"nums": [5,4,-1,7,8]}',
            expectedOutput: '23',
            isPublic: false,
            order: 3,
          }
        ]
      }
    }
  });

  // Problem 5: Binary Search
  const binarySearch = await prisma.problem.create({
    data: {
      title: 'Binary Search',
      slug: 'binary-search',
      description: 'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.',
      difficulty: 'Easy',
      constraints: '1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll the integers in nums are unique.\nnums is sorted in ascending order.',
      inputFormat: 'nums: List[int], target: int',
      outputFormat: 'int',
      examples: 'Input: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4\nExplanation: 9 exists in nums and its index is 4',
      functionName: 'search',
      starterCode: 'def search(nums, target):\n    # Write your solution here\n    pass\n',
      testCases: {
        create: [
          {
            input: '{"nums": [-1,0,3,5,9,12], "target": 9}',
            expectedOutput: '4',
            isPublic: true,
            order: 1,
          },
          {
            input: '{"nums": [-1,0,3,5,9,12], "target": 2}',
            expectedOutput: '-1',
            isPublic: true,
            order: 2,
          },
          {
            input: '{"nums": [5], "target": -5}',
            expectedOutput: '-1',
            isPublic: false,
            order: 3,
          }
        ]
      }
    }
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
