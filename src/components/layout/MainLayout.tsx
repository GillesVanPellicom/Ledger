import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidenav from './Sidenav';
import Spinner from '../ui/Spinner';
import { useBackupStore } from '../../store/useBackupStore';
import { useIncomeStore } from '../../store/useIncomeStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const { isBackingUp } = useBackupStore();
  const { toCheckCount } = useIncomeStore();
  const { settings } = useSettingsStore();

  // Log path changes to debug back button issue
  useEffect(() => {
    console.log('Navigated to:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <Sidenav pendingIncomeCount={toCheckCount} />

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

        {settings.dev?.mockTime?.enabled && settings.dev.mockTime.date && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
            <div className="bg-red-100 dark:bg-red-900/80 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-sm">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                Mock Time: {format(new Date(settings.dev.mockTime.date), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MainLayout;
