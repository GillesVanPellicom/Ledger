import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Receipt, 
  Package, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '../../utils/cn';

const Sidenav = ({ isCollapsed, toggleSidebar }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const navItems = [
    { path: '/', label: 'Receipts', icon: Receipt },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <aside 
      className={cn(
        "h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out z-20",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header / Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
        {!isCollapsed && (
          <span className="font-bold text-xl tracking-tight text-accent">
            HomeFin
          </span>
        )}
        <button 
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 transition-colors ml-auto"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              isActive 
                ? "bg-accent text-white shadow-md" 
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            )}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon size={20} className={cn("shrink-0", isCollapsed && "mx-auto")} />
            {!isCollapsed && (
              <span className="font-medium truncate">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Dark Mode Toggle */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800",
            isCollapsed && "justify-center px-0"
          )}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          {!isCollapsed && (
            <span className="font-medium">
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidenav;
