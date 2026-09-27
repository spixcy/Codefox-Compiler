import { Link } from 'react-router-dom';
import { PROBLEMS_DATA } from '../data/problems';

export default function ProblemList() {
  return (
    <div className="max-w-4xl mx-auto p-8 w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Study Plan</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Running 100% locally in your browser via WebAssembly (Zero external server needed)
          </p>
        </div>
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-full font-medium">
          Offline / Serverless Mode
        </span>
      </div>
      
      <div className="bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-900 border-b border-neutral-700">
              <th className="p-4 font-semibold text-neutral-400">#</th>
              <th className="p-4 font-semibold text-neutral-400">Title</th>
              <th className="p-4 font-semibold text-neutral-400">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {PROBLEMS_DATA.map((prob) => (
              <tr key={prob.id} className="border-b border-neutral-700/50 hover:bg-neutral-700/50 transition-colors">
                <td className="p-4 text-neutral-500">{prob.id}</td>
                <td className="p-4">
                  <Link to={`/problems/${prob.slug}`} className="text-white hover:text-orange-400 font-medium">
                    {prob.title}
                  </Link>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold
                    ${prob.difficulty === 'Easy' ? 'text-green-400 bg-green-400/10' : 
                      prob.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-400/10' : 
                      'text-red-400 bg-red-400/10'}`}>
                    {prob.difficulty}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
