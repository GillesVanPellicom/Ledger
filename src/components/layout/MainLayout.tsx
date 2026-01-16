import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidenav from './Sidenav';
import Spinner from '../ui/Spinner';
import { useBackupStore } from '../../store/useBackupStore';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const { isBackingUp } = useBackupStore();

  // Log path changes to debug back button issue
  useEffect(() => {
    console.log('Navigated to:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <Sidenav />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
        <div className="absolute top-0 bottom-0 right-0 w-[9px] border-l border-gray-200 dark:border-zinc-800 z-[60] pointer-events-none" />
        <div className="flex-1 overflow-y-scroll scrollbar-gutter-stable relative">
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
