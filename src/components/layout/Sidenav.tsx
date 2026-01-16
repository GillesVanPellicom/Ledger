import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Receipt,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Settings,
  CreditCard,
  Users,
  Database,
  TrendingUp
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useUIStore } from '../../store/useUIStore';

const Sidenav: React.FC = () => {
  const location = useLocation();
  const { settings } = useSettingsStore();
  const { isSidenavCollapsed, toggleSidenav, openSettingsModal } = useUIStore();

  const navItems = [
    { path: '/', label: 'Expenses', icon: Receipt, activePaths: ['/', '/receipts'] },
    { path: '/income', label: 'Income', icon: TrendingUp, activePaths: ['/income'] },
    { path: '/reference-data', label: 'Reference Data', icon: Database, activePaths: ['/reference-data'] },
    { path: '/analytics', label: 'Analytics', icon: BarChart2, activePaths: ['/analytics'] },
  ];

  if (settings.modules.paymentMethods?.enabled) {
    navItems.push({
      path: '/payment-methods',
      label: 'Payment Methods',
      icon: CreditCard,
      activePaths: ['/payment-methods']
    });
  }

  if (settings.modules.debt?.enabled) {
    navItems.push({ path: '/entities', label: 'Entities', icon: Users, activePaths: ['/entities'] });
  }

  return (
    <aside
      className={cn(
        "h-full bg-gray-50 dark:bg-zinc-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out z-20",
        isSidenavCollapsed ? "w-14" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-gray-200 dark:border-gray-800 shrink-0 transition-all duration-300",
          isSidenavCollapsed ? "justify-center px-2" : "justify-between px-4"
        )}
        style={{ height: '86px' }}
      >
        <span className={cn(
          "font-bold text-xl tracking-tight text-accent overflow-hidden whitespace-nowrap transition-all duration-300",
          isSidenavCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}>
          Ledger
        </span>
        <button
          onClick={toggleSidenav}
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 transition-colors shrink-0"
        >
          {isSidenavCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
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
                "flex items-center h-10 px-2.5 rounded-lg transition-all duration-300 group overflow-hidden",
                isSidenavCollapsed ? "justify-center gap-0" : "justify-start gap-3",
                isActive
                  ? "bg-accent text-white shadow-md"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              )}
              title={isSidenavCollapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={cn(
                "font-medium truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
                isSidenavCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </nav>

      <div className="p-2 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => openSettingsModal()}
          className={cn(
            "flex items-center h-10 px-2.5 w-full rounded-lg transition-all duration-300 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 overflow-hidden",
            isSidenavCollapsed ? "justify-center gap-0" : "justify-start gap-3"
          )}
          title="Settings"
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span className={cn(
            "font-medium truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
            isSidenavCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>
            Settings
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidenav;
