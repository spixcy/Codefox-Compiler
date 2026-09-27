import os
import sys
import json
import traceback
import time
import importlib.util

def run():
    try:
        workspace = os.environ.get('WORKSPACE_PATH', '/app/workspace')

        # Load test cases
        with open(os.path.join(workspace, 'test_cases.json'), 'r') as f:
            test_cases = json.load(f)
            
        # Load user configuration (function name, etc)
        with open(os.path.join(workspace, 'config.json'), 'r') as f:
            config = json.load(f)
            
        function_name = config.get('functionName')
        
        # Import user solution
        spec = importlib.util.spec_from_file_location("solution", os.path.join(workspace, "solution.py"))
        solution_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(solution_module)
        
        # Get the target function
        if not hasattr(solution_module, function_name):
            print(json.dumps({
                "status": "EXECUTION_ERROR",
                "message": f"Function {function_name} not found in solution."
            }))
            return

        target_function = getattr(solution_module, function_name)
        
        results = []
        passed_count = 0
        total_time = 0.0
        
        for idx, tc in enumerate(test_cases):
            input_data = tc.get('input', {})
            # If input is a json string inside the dict, parse it
            if isinstance(input_data, str):
                try:
                    input_data = json.loads(input_data)
                except:
                    pass
            
            expected = tc.get('expectedOutput')
            if isinstance(expected, str):
                try:
                    expected = json.loads(expected)
                except:
                    pass

            # Execute
            start_time = time.perf_counter()
            try:
                # Assuming input_data is a dictionary of arguments
                if isinstance(input_data, dict):
                    actual = target_function(**input_data)
                elif isinstance(input_data, list):
                    actual = target_function(*input_data)
                else:
                    actual = target_function(input_data)
                    
                end_time = time.perf_counter()
                
                runtime = end_time - start_time
                total_time += runtime
                
                # Output Comparison
                # (A real judge would need more robust comparison for arrays, floats, etc.)
                is_passed = (actual == expected)
                
                if is_passed:
                    passed_count += 1
                
                results.append({
                    "test_case_id": tc.get('id', idx),
                    "passed": is_passed,
                    "expected": expected,
                    "actual": actual,
                    "runtime": runtime
                })
                
                # If wrong answer on submit (not all tests passed), break early?
                # We can just run all for simplicity, or break. Let's run all provided.

            except Exception as e:
                # Runtime Error
                print(json.dumps({
                    "status": "RUNTIME_ERROR",
                    "message": traceback.format_exc(),
                    "passedTests": passed_count,
                    "totalTests": len(test_cases)
                }))
                return

        status = "ACCEPTED" if passed_count == len(test_cases) else "WRONG_ANSWER"
        
        # Output final result
        print(json.dumps({
            "status": status,
            "passedTests": passed_count,
            "totalTests": len(test_cases),
            "runtime": round(total_time, 4),
            "memory": 0, # Memory tracking requires external tools (e.g. psutil or cgroups)
            "results": results
        }))

    except Exception as e:
        print(json.dumps({
            "status": "INTERNAL_ERROR",
            "message": traceback.format_exc()
        }))

if __name__ == "__main__":
    run()
