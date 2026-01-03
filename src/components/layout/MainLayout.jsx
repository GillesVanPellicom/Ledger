import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidenav from './Sidenav';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';

const MainLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidenav-collapsed');
    return saved === 'true';
  });
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Routes that are "root" routes and shouldn't show a back button
  const rootRoutes = ['/', '/products', '/analytics'];
  const showBackButton = !rootRoutes.includes(location.pathname);

  useEffect(() => {
    localStorage.setItem('sidenav-collapsed', isCollapsed);
  }, [isCollapsed]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <Sidenav isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
        {showBackButton && (
          <div className="absolute top-4 left-4 z-10">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        )}
        
        <div className={cn(
          "flex-1 overflow-auto p-6",
          showBackButton && "pt-16" // Add padding if back button is present
        )}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
