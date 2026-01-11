import React, {useState, useEffect} from 'react';
import {Outlet, useLocation} from 'react-router-dom';
import Sidenav from './Sidenav';
import Spinner from '../ui/Spinner';
import { useBackupStore } from '../../store/useBackupStore';

interface MainLayoutProps {
  openSettingsModal: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({openSettingsModal}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidenav-collapsed');
    return saved === 'true';
  });

  const location = useLocation();
  const {isBackingUp} = useBackupStore();

  // Log path changes to debug back button issue
  useEffect(() => {
    console.log('Navigated to:', location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('sidenav-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <Sidenav isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} openSettingsModal={openSettingsModal}/>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300">
        <div className="flex-1 overflow-auto">
          <Outlet/>
        </div>

        {isBackingUp && (
          <div className="absolute bottom-4 right-4 z-50">
            <Spinner className="h-6 w-6 text-accent"/>
          </div>
        )}
      </main>
    </div>
  );
};

export default MainLayout;
