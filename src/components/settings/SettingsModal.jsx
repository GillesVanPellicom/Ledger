import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { MoonIcon, SunIcon, ArrowPathIcon, BugAntIcon, CreditCardIcon, DocumentTextIcon, FolderIcon, TrashIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';
import ErrorModal from '../ui/ErrorModal';
import { useSettings } from '../../context/SettingsContext';

const SettingsModal = ({ isOpen, onClose, initialTab = 'appearance' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [uiScale, setUiScale] = useState(100);
  const [isDev, setIsDev] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [testError, setTestError] = useState(null);
  const { settings, updateSettings } = useSettings();
  const [datastorePath, setDatastorePath] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const loadInitialSettings = async () => {
      if (window.electronAPI) {
        const electronSettings = await window.electronAPI.getSettings();
        if (electronSettings.theme) {
          setIsDarkMode(electronSettings.theme === 'dark');
        }
        if (electronSettings.uiScale) {
          setUiScale(electronSettings.uiScale);
        }
        if (electronSettings.datastore?.folderPath) {
          setDatastorePath(electronSettings.datastore.folderPath);
        }
      } else {
        const localSettings = JSON.parse(localStorage.getItem('app-settings') || '{}');
        if (localSettings.theme) {
          setIsDarkMode(localSettings.theme === 'dark');
        }
        if (localSettings.uiScale) {
          setUiScale(localSettings.uiScale);
        }
      }
      if (import.meta.env.DEV) {
        setIsDev(true);
      }
    };
    loadInitialSettings();
  }, []);

  useEffect(() => {
    setDatastorePath(settings.datastore?.folderPath || '');
    setIsDarkMode(settings.theme === 'dark');
  }, [settings]);

  const handleThemeChange = (newTheme) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateSettings({ ...settings, theme: newTheme });
  };

  const handleUiScaleChange = (e) => {
    setUiScale(parseInt(e.target.value, 10));
  };

  const handleUiScaleSave = () => {
    document.documentElement.style.fontSize = `${uiScale}%`;
    updateSettings({ ...settings, uiScale });
  };

  const resetUiScale = () => {
    setUiScale(100);
    document.documentElement.style.fontSize = '100%';
    updateSettings({ ...settings, uiScale: 100 });
  };

  const handleModuleToggle = (key) => {
    const newModules = { ...settings.modules, [key]: { ...settings.modules[key], enabled: !settings.modules[key].enabled } };
    updateSettings({ ...settings, modules: newModules });
  };

  const handlePdfToggle = (key) => {
    const newPdfSettings = { ...settings.pdf, [key]: !settings.pdf[key] };
    updateSettings({ ...settings, pdf: newPdfSettings });
  };

  const handleGenerateError = () => {
    try {
      throw new Error("This is a test error generated from Settings.");
    } catch (e) {
      setTestError(e);
      setShowErrorModal(true);
    }
  };

  const handleSelectDatastore = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        setDatastorePath(path);
        updateSettings({ ...settings, datastore: { folderPath: path } });
      }
    }
  };
  
  const handleRemoveDatastore = () => {
    setDatastorePath('');
    updateSettings({ ...settings, datastore: { folderPath: '' } });
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'modules', label: 'Modules' },
    { id: 'pdf', label: 'PDF' },
    { id: 'data', label: 'Data' },
  ];

  if (isDev) {
    tabs.push({ id: 'development', label: 'Development' });
  }
  
  tabs.sort((a, b) => a.label.localeCompare(b.label));

  const Toggle = ({ label, description, isEnabled, onToggle }) => (
    <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
            isEnabled ? "bg-accent" : "bg-gray-200 dark:bg-gray-700"
          )}
        >
          <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", isEnabled ? "translate-x-5" : "translate-x-0")} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
        <div className="flex h-[400px]">
          <div className="w-48 border-r border-gray-200 dark:border-gray-800 pr-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === tab.id ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50")}>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 pl-6 pr-2 overflow-y-auto">
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Theme</h3>
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl"><div className="flex items-center gap-3"><div className={cn("p-2 rounded-lg", !isDarkMode ? "bg-blue-100 text-blue-600" : "bg-gray-800 text-gray-400")}><SunIcon className="h-6 w-6" /></div><div><p className="font-medium text-gray-900 dark:text-gray-100">Light Mode</p><p className="text-sm text-gray-500">Default appearance</p></div></div><button onClick={() => handleThemeChange('light')} className={cn("w-6 h-6 rounded-full border flex items-center justify-center", !isDarkMode ? "border-accent bg-accent" : "border-gray-300 dark:border-gray-600")}>{!isDarkMode && <div className="w-2.5 h-2.5 bg-white rounded-full" />}</button></div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl mt-3"><div className="flex items-center gap-3"><div className={cn("p-2 rounded-lg", isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-gray-100 text-gray-400")}><MoonIcon className="h-6 w-6" /></div><div><p className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</p><p className="text-sm text-gray-500">Easier on the eyes</p></div></div><button onClick={() => handleThemeChange('dark')} className={cn("w-6 h-6 rounded-full border flex items-center justify-center", isDarkMode ? "border-accent bg-accent" : "border-gray-300 dark:border-gray-600")}>{isDarkMode && <div className="w-2.5 h-2.5 bg-white rounded-full" />}</button></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">UI Scale</h3><Button variant="ghost" size="sm" onClick={resetUiScale} className="h-8 px-2 text-xs"><ArrowPathIcon className="h-3 w-3 mr-1" />Reset</Button></div>
                  <div className="flex items-center gap-4"><input type="range" min="50" max="200" step="10" value={uiScale} onChange={handleUiScaleChange} onMouseUp={handleUiScaleSave} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" /><span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-12 text-right">{uiScale}%</span></div>
                  <p className="text-xs text-gray-500 mt-2">Adjust the size of the user interface.</p>
                </div>
              </div>
            )}
            {activeTab === 'modules' && (<div className="space-y-6"><div><h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Modules</h3><div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"><CreditCardIcon className="h-6 w-6" /></div><div><p className="font-medium text-gray-900 dark:text-gray-100">Payment Methods</p><p className="text-sm text-gray-500">Track spending across different payment methods.</p></div></div><button onClick={() => handleModuleToggle('paymentMethods')} className={cn("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2", settings.modules.paymentMethods.enabled ? "bg-accent" : "bg-gray-200 dark:bg-gray-700")}><span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", settings.modules.paymentMethods.enabled ? "translate-x-5" : "translate-x-0")} /></button></div></div></div></div>)}
            {activeTab === 'pdf' && (<div className="space-y-4"><div><h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">PDF Content</h3><Toggle label="Show Unique Item Count" description="Include the number of unique items on the receipt." isEnabled={settings.pdf.showUniqueItems} onToggle={() => handlePdfToggle('showUniqueItems')} /><div className="mt-3"><Toggle label="Show Total Quantity" description="Include the total quantity of all items." isEnabled={settings.pdf.showTotalQuantity} onToggle={() => handlePdfToggle('showTotalQuantity')} /></div><div className="mt-3"><Toggle label="Show Payment Method" description="Display the payment method used." isEnabled={settings.pdf.showPaymentMethod} onToggle={() => handlePdfToggle('showPaymentMethod')} /></div><div className="mt-3"><Toggle label="Add Receipt Images" description="Include receipt images in the PDF." isEnabled={settings.pdf.addReceiptImages} onToggle={() => handlePdfToggle('addReceiptImages')} /></div></div><div><h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Bulk Export</h3><Toggle label="Add Summary Page" description="Append a 'super-receipt' summarizing all receipts in a bulk export." isEnabled={settings.pdf.addSummaryPage} onToggle={() => handlePdfToggle('addSummaryPage')} /></div></div>)}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Datastore</h3>
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          <FolderIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">Datastore Folder</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs" title={datastorePath}>
                            {datastorePath || 'No folder selected'}
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleSelectDatastore}>Select Folder</Button>
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
                      <Button variant="danger" onClick={handleGenerateError}>Generate Error</Button>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 mr-4">
                        <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <TrashIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">Reset Datastore</p>
                          <p className="text-sm text-gray-500">Remove the datastore folder path from settings.</p>
                        </div>
                      </div>
                      <Button variant="warning" onClick={handleRemoveDatastore}>Reset</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
      <ErrorModal isOpen={showErrorModal} onClose={() => setShowErrorModal(false)} error={testError} />
    </>
  );
};

export default SettingsModal;
