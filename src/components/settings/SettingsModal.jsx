import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { MoonIcon, SunIcon, ArrowPathIcon, BugAntIcon, CreditCardIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';
import ErrorModal from '../ui/ErrorModal';
import { useSettings } from '../../context/SettingsContext';

const SettingsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('appearance');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [uiScale, setUiScale] = useState(100);
  const [isDev, setIsDev] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [testError, setTestError] = useState(null);
  const { settings, updateModuleSettings } = useSettings();

  useEffect(() => {
    const loadSettings = async () => {
      if (window.electronAPI) {
        const settings = await window.electronAPI.getSettings();
        if (settings.theme) {
          const isDark = settings.theme === 'dark';
          setIsDarkMode(isDark);
          if (isDark) document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }
        if (settings.uiScale) {
          setUiScale(settings.uiScale);
          document.documentElement.style.fontSize = `${settings.uiScale}%`;
        }
        
        if (import.meta.env.DEV) {
            setIsDev(true);
        }
      } else {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
          const isDark = savedTheme === 'dark';
          setIsDarkMode(isDark);
          if (isDark) document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }
        const savedScale = localStorage.getItem('uiScale');
        if (savedScale) {
          const scale = parseInt(savedScale, 10);
          setUiScale(scale);
          document.documentElement.style.fontSize = `${scale}%`;
        }
        if (import.meta.env.DEV) {
            setIsDev(true);
        }
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async (newSettings) => {
    if (window.electronAPI) {
      const currentSettings = await window.electronAPI.getSettings();
      await window.electronAPI.saveSettings({ ...currentSettings, ...newSettings });
    } else {
      if (newSettings.theme) localStorage.setItem('theme', newSettings.theme);
      if (newSettings.uiScale) localStorage.setItem('uiScale', newSettings.uiScale);
    }
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    const theme = newMode ? 'dark' : 'light';
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    saveSettings({ theme });
  };

  const handleUiScaleChange = (e) => {
    const newScale = parseInt(e.target.value, 10);
    setUiScale(newScale);
    document.documentElement.style.fontSize = `${newScale}%`;
    saveSettings({ uiScale: newScale });
  };

  const resetUiScale = () => {
    setUiScale(100);
    document.documentElement.style.fontSize = '100%';
    saveSettings({ uiScale: 100 });
  };

  const handleGenerateError = () => {
    try {
        throw new Error("This is a test error generated from Settings.");
    } catch (e) {
        setTestError(e);
        setShowErrorModal(true);
    }
  };

  const handleModuleToggle = (module, isEnabled) => {
    updateModuleSettings(module, { enabled: isEnabled });
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'modules', label: 'Modules' },
  ];

  if (isDev) {
      tabs.push({ id: 'development', label: 'Development' });
  }

  return (
    <>
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">UI Scale</h3>
                  <Button variant="ghost" size="sm" onClick={resetUiScale} className="h-8 px-2 text-xs">
                    <ArrowPathIcon className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="10"
                    value={uiScale}
                    onChange={handleUiScaleChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-12 text-right">{uiScale}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Adjust the size of the user interface.</p>
              </div>
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Modules</h3>
                <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <CreditCardIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">Payment Methods</p>
                        <p className="text-sm text-gray-500">Track spending across different payment methods.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleModuleToggle('paymentMethods', !settings.paymentMethods?.enabled)}
                      className={cn(
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
                        settings.paymentMethods?.enabled ? "bg-accent" : "bg-gray-200 dark:bg-gray-700"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          settings.paymentMethods?.enabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'development' && isDev && (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Development Tools</h3>
                    <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 mr-4">
                                <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                    <BugAntIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">Test Error Modal</p>
                                    <p className="text-sm text-gray-500">Generate a fake error to test the error modal.</p>
                                </div>
                            </div>
                            <Button variant="danger" onClick={handleGenerateError}>
                                Generate Error
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
    <ErrorModal 
        isOpen={showErrorModal} 
        onClose={() => setShowErrorModal(false)} 
        error={testError} 
    />
    </>
  );
};

export default SettingsModal;
