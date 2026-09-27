import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProblemList from './pages/ProblemList';
import Workspace from './pages/Workspace';

function App() {
  return (
    <BrowserRouter>
      <div className="h-screen bg-neutral-900 text-white flex flex-col font-sans overflow-hidden">
        {/* Navbar */}
        <nav className="h-14 bg-neutral-800 border-b border-neutral-700 flex items-center px-6 shrink-0">
          <div className="text-xl font-bold tracking-tight text-white mr-8">
            <span className="text-orange-500">Antigravity</span>Code
          </div>
          <div className="flex gap-4">
            <a href="/" className="text-neutral-300 hover:text-white text-sm font-medium">Problems</a>
          </div>
        </nav>

        {/* Main Content — fills remaining height */}
        <div className="flex-1 min-h-0 flex flex-col">
          <Routes>
            <Route path="/" element={<ProblemList />} />
            <Route path="/problems/:slug" element={<Workspace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
