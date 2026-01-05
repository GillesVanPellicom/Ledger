import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  ReceiptPercentIcon, 
  CubeIcon, 
  ChartBarIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  Cog6ToothIcon,
  CreditCardIcon
} from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import { useSettings } from '../../context/SettingsContext';

const Sidenav = ({ isCollapsed, toggleSidebar, openSettingsModal }) => {
  const location = useLocation();
  const { settings } = useSettings();

  const navItems = [
    { path: '/', label: 'Receipts', icon: ReceiptPercentIcon, activePaths: ['/', '/receipts'] },
    { path: '/products', label: 'Products', icon: CubeIcon, activePaths: ['/products'] },
    { path: '/analytics', label: 'Analytics', icon: ChartBarIcon, activePaths: ['/analytics'] },
  ];

  if (settings.modules.paymentMethods?.enabled) {
    navItems.push({ path: '/payment-methods', label: 'Payment Methods', icon: CreditCardIcon, activePaths: ['/payment-methods'] });
  }

  return (
    <aside 
      className={cn(
        "h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out z-20",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
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
          {isCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const isActive = item.activePaths.some(p => location.pathname.startsWith(p) && (p !== '/' || location.pathname === '/'));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-accent text-white shadow-md" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isCollapsed && "mx-auto")} />
              {!isCollapsed && (
                <span className="font-medium truncate">
                  {item.label}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => openSettingsModal()}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800",
            isCollapsed && "justify-center px-0"
          )}
          title="Settings"
        >
          <Cog6ToothIcon className="h-5 w-5" />
          {!isCollapsed && (
            <span className="font-medium">
              Settings
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidenav;
