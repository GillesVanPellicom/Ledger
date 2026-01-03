import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css'

function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">HomeFin Dashboard</h1>
      <p>Welcome to your financial manager.</p>
    </div>
  );
}

function Settings() {
  const [dbPath, setDbPath] = useState('');
  const [status, setStatus] = useState('');
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      setIsDev(window.electronAPI.isDev);
      
      if (window.electronAPI.isDev && window.electronAPI.defaultDbPath) {
        setDbPath(window.electronAPI.defaultDbPath);
        
        // Check if already connected
        window.electronAPI.isDbConnected().then(isConnected => {
          if (isConnected) {
            setStatus('Connected to database successfully (Dev Mode)');
          } else {
             // Fallback if for some reason main process didn't connect
             window.electronAPI.connectDb(window.electronAPI.defaultDbPath).then(result => {
               if (result.success) {
                 setStatus('Connected to database successfully (Dev Mode)');
               } else {
                 setStatus(`Failed to connect: ${result.error}`);
               }
             });
          }
        });
      }
    }
  }, []);

  const handleFileSelect = async () => {
    if (!window.electronAPI) return;
    const filePath = await window.electronAPI.selectFile();
    if (filePath) {
      setDbPath(filePath);
    }
  };

  const handleConnect = async () => {
    if (!window.electronAPI) {
      setStatus('Electron API not available');
      return;
    }
    const result = await window.electronAPI.connectDb(dbPath);
    if (result.success) {
      setStatus('Connected to database successfully');
    } else {
      setStatus(`Failed to connect: ${result.error}`);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      
      {isDev && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
          <p className="font-bold">Development Mode</p>
          <p>This setting is ignored in development. Using default database.</p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Database Path</label>
        <div className="flex mt-1">
          <input 
            type="text" 
            value={dbPath} 
            onChange={(e) => setDbPath(e.target.value)}
            className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            placeholder="/path/to/your/database.db"
            disabled={isDev}
          />
          <button
            onClick={handleFileSelect}
            className={`bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-r border border-l-0 border-gray-300 ${isDev ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isDev}
          >
            Browse
          </button>
        </div>
      </div>
      <button 
        onClick={handleConnect}
        className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${isDev ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isDev}
      >
        Connect Database
      </button>
      {status && <p className="mt-2 text-sm text-gray-600">{status}</p>}
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex">
        <nav className="w-64 bg-white shadow-md">
          <div className="p-4 font-bold text-xl border-b">HomeFin</div>
          <ul className="p-4 space-y-2">
            <li><Link to="/" className="block p-2 hover:bg-gray-50 rounded">Dashboard</Link></li>
            <li><Link to="/settings" className="block p-2 hover:bg-gray-50 rounded">Settings</Link></li>
          </ul>
        </nav>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
