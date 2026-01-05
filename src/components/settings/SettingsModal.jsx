import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';

const SettingsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('appearance');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'modules', label: 'Modules' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <div className="flex h-[400px]">
        {/* Sidebar */}
        <div className="w-48 border-r border-gray-200 dark:border-gray-800 pr-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 pl-6 overflow-y-auto">
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Theme</h3>
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", isDarkMode ? "bg-gray-800 text-gray-400" : "bg-blue-100 text-blue-600")}>
                      <SunIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Light Mode</p>
                      <p className="text-sm text-gray-500">Default appearance</p>
                    </div>
                  </div>
                  <button
                    onClick={() => !isDarkMode || toggleTheme()}
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center",
                      !isDarkMode ? "border-accent bg-accent" : "border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {!isDarkMode && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl mt-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-gray-100 text-gray-400")}>
                      <MoonIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</p>
                      <p className="text-sm text-gray-500">Easier on the eyes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => isDarkMode || toggleTheme()}
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center",
                      isDarkMode ? "border-accent bg-accent" : "border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {isDarkMode && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Font Size</h3>
                <div className="flex gap-2">
                  {['Small', 'Medium', 'Large'].map((size) => (
                    <button
                      key={size}
                      className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Font size adjustment coming soon.</p>
              </div>
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <p>No modules available.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
