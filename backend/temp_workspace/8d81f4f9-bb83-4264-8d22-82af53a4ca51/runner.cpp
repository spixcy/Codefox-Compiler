
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
static string toJson(const string& s) { return "\"" + s + "\""; }
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
        s += "\"" + v[i] + "\"";
        if (i + 1 < v.size()) s += ",";
    }
    s += "]";
    return s;
}

int main() {
    Solution solution;
    
        {
          auto arg_0 = vector<int>{2,7,11,15};
          auto arg_1 = 9;
          auto t0 = chrono::high_resolution_clock::now();
          auto actualVal = solution.twoSum(arg_0, arg_1);
          auto t1 = chrono::high_resolution_clock::now();
          double elapsed = chrono::duration<double>(t1 - t0).count();
          string expectedStr = "[0,1]";
          string actualStr = toJson(actualVal);
          bool isPassed = (expectedStr == actualStr);
          cout << "{"
               << "\"id\":" << 1 << ","
               << "\"isPublic\":" << (true ? "true" : "false") << ","
               << "\"expected\":" << expectedStr << ","
               << "\"actual\":" << actualStr << ","
               << "\"passed\":" << (isPassed ? "true" : "false") << ","
               << "\"runtime\":" << elapsed
               << "}" << endl;
        }
      
    return 0;
}
    