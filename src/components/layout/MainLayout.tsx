import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidenav from './Sidenav';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import { useBackupContext } from '../../context/BackupContext';
import Spinner from '../ui/Spinner';

interface MainLayoutProps {
  openSettingsModal: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ openSettingsModal }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidenav-collapsed');
    return saved === 'true';
  });
  
  const location = useLocation();
  const navigate = useNavigate();
  const { isBackingUp } = useBackupContext();

  // Log path changes to debug back button issue
  useEffect(() => {
    console.log('Navigated to:', location.pathname);
  }, [location.pathname]);
  
  const rootRoutes = ['/', '/products', '/analytics', '/stores', '/entities', '/payment-methods'];
  const showBackButton = !rootRoutes.includes(location.pathname);

  useEffect(() => {
    localStorage.setItem('sidenav-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <Sidenav isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} openSettingsModal={openSettingsModal} />
      
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
          showBackButton && "pt-16"
        )}>
          <Outlet />
        </div>

        {isBackingUp && (
          <div className="absolute bottom-4 right-4 z-50">
            <Spinner className="h-6 w-6 text-accent" />
          </div>
        )}
      </main>
    </div>
  );
};

export default MainLayout;
