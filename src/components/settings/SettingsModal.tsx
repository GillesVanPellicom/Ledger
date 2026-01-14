import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { MoonIcon, SunIcon, ArrowPathIcon, BugAntIcon, CreditCardIcon, DocumentTextIcon, FolderIcon, TrashIcon, InformationCircleIcon, UserGroupIcon, ServerIcon, PencilIcon as PencilIconSolid } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';
import ErrorModal from '../ui/ErrorModal';
import Tooltip from '../ui/Tooltip';
import Input from '../ui/Input';
import Card from '../ui/Card';
import Switch from '../ui/Switch';
import '../../electron.d';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useBackupStore } from '../../store/useBackupStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab = 'appearance' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isDev, setIsDev] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [testError, setTestError] = useState<Error | null>(null);
  const { settings, updateSettings } = useSettingsStore();
  const { backupCount, triggerBackup, isBackingUp } = useBackupStore();
  const [datastorePath, setDatastorePath] = useState('');
  const [tooltipText, setTooltipText] = useState('');
  const [backupSettings, setBackupSettings] = useState({ maxBackups: 5, interval: 5, editsSinceLastBackup: 0 });
  const [userName, setUserName] = useState('');
  const [uiScale, setUiScale] = useState(100);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const meta = import.meta as ImportMeta & { env: { DEV?: boolean } };
    if (meta.env.DEV) setIsDev(true);
  }, []);

  useEffect(() => {
    setDatastorePath(settings.datastore?.folderPath || '');
    setTooltipText(settings.datastore?.folderPath || '');
    if (settings.backup) {
      setBackupSettings(settings.backup);
    }
    if (settings.userName) {
      setUserName(settings.userName);
    }
    if (settings.uiScale) {
      setUiScale(settings.uiScale);
    }
  }, [settings]);

  const handleThemeChange = (newTheme: string) => {
    updateSettings({ theme: newTheme });
  };

  const handleUiScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => setUiScale(parseInt(e.target.value, 10));
  const handleUiScaleSave = () => {
    document.documentElement.style.fontSize = `${uiScale}%`;
    updateSettings({ uiScale });
  };
  const resetUiScale = () => {
    setUiScale(100);
    document.documentElement.style.fontSize = '100%';
    updateSettings({ uiScale: 100 });
  };

  const handleModuleToggle = (key: string) => {
    const newModules = { ...settings.modules, [key]: { ...(settings.modules as any)[key], enabled: !(settings.modules as any)[key].enabled } };
    updateSettings({ modules: newModules });
  };

  const handlePdfToggle = (key: string) => {
    const newPdfSettings = { ...settings.pdf, [key]: !(settings.pdf as any)[key] };
    updateSettings({ pdf: newPdfSettings });
  };

  const handleBackupSettingChange = (key: string, value: string) => {
    const newBackupSettings = { ...backupSettings, [key]: parseInt(value, 10) };
    setBackupSettings(newBackupSettings);
    updateSettings({ backup: newBackupSettings });
  };

  const resetBackupSettings = () => {
    const defaultBackupSettings = { maxBackups: 5, interval: 5, editsSinceLastBackup: 0 };
    setBackupSettings(defaultBackupSettings);
    updateSettings({ backup: defaultBackupSettings });
  };

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);
  };

  const handleUserNameSave = () => {
    if (userName.trim()) {
      const capitalizedName = userName.trim().charAt(0).toUpperCase() + userName.trim().slice(1);
      updateSettings({ userName: capitalizedName });
    }
  };

  const handleGenerateError = () => {
    try {
      throw new Error("This is a test error generated from Settings.");
    } catch (e: any) {
      setTestError(e);
      setShowErrorModal(true);
    }
  };

  const handleSelectDatastore = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        setDatastorePath(path);
        updateSettings({ datastore: { folderPath: path } });
      }
    }
  };
  
  const handleRemoveDatastore = () => {
    setDatastorePath('');
    updateSettings({ datastore: { folderPath: '' } });
  };

  const handleResetAllSettings = async () => {
    if (window.electronAPI) {
      await window.electronAPI.resetSettings();
      await window.electronAPI.quitApp();
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(datastorePath);
    setTooltipText('Copied!');
    setTimeout(() => setTooltipText(datastorePath), 2000);
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'modules', label: 'Modules' },
    { id: 'pdf', label: 'PDF' },
    { id: 'data', label: 'Data' },
    { id: 'backup', label: 'Backup' },
    { id: 'formatting', label: 'Formatting' },
  ];

  if (isDev) tabs.push({ id: 'development', label: 'Development' });
  tabs.sort((a, b) => a.label.localeCompare(b.label));

  const SectionTitle = ({ title, tooltip }: { title: string, tooltip?: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
      {tooltip && <Tooltip content={tooltip}><InformationCircleIcon className="h-5 w-5 text-gray-400 hover:text-gray-500 cursor-help" /></Tooltip>}
    </div>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
        <div className="flex h-[400px]">
          <div className="w-48 border-r border-gray-200 dark:border-gray-800 pr-4">
            <nav className="space-y-1">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === tab.id ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50")}>{tab.label}</button>)}</nav>
          </div>
          <div className="flex-1 pl-6 pr-2 overflow-y-auto">
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <SectionTitle title="Theme" tooltip="Choose between light and dark mode for the application interface." />
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl"><div className="flex items-center gap-3"><div className={cn("p-2 rounded-lg", settings.theme === 'light' ? "bg-blue-100 text-blue-600" : "bg-gray-800 text-gray-400")}><SunIcon className="h-6 w-6" /></div><div><p className="font-medium text-gray-900 dark:text-gray-100">Light Mode</p><p className="text-sm text-gray-500">Default appearance</p></div></div><button onClick={() => handleThemeChange('light')} className={cn("w-6 h-6 rounded-full border flex items-center justify-center", settings.theme === 'light' ? "border-accent bg-accent" : "border-gray-300 dark:border-gray-600")}>{settings.theme === 'light' && <div className="w-2.5 h-2.5 bg-white rounded-full" />}</button></div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-xl mt-3"><div className="flex items-center gap-3"><div className={cn("p-2 rounded-lg", settings.theme === 'dark' ? "bg-blue-900/30 text-blue-400" : "bg-gray-100 text-gray-400")}><MoonIcon className="h-6 w-6" /></div><div><p className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</p><p className="text-sm text-gray-500">Easier on the eyes</p></div></div><button onClick={() => handleThemeChange('dark')} className={cn("w-6 h-6 rounded-full border flex items-center justify-center", settings.theme === 'dark' ? "border-accent bg-accent" : "border-gray-300 dark:border-gray-600")}>{settings.theme === 'dark' && <div className="w-2.5 h-2.5 bg-white rounded-full" />}</button></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <SectionTitle title="UI Scale" tooltip="Adjust the size of text and other interface elements." />
                    <Button variant="ghost" size="sm" onClick={resetUiScale} className="h-8 px-2 text-xs"><ArrowPathIcon className="h-3 w-3 mr-1" />Reset</Button>
                  </div>
                  <div className="flex items-center gap-4"><input type="range" min="50" max="200" step="10" value={uiScale} onChange={handleUiScaleChange} onMouseUp={handleUiScaleSave} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" /><span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-12 text-right">{uiScale}%</span></div>
                </div>
              </div>
            )}
            {activeTab === 'modules' && (
              <div className="space-y-6">
                <div>
                  <SectionTitle title="Modules" tooltip="Enable or disable optional features to customize your experience." />
                  <div className="space-y-4">
                    <Switch 
                      label="Payment Methods" 
                      description="Track spending across different payment methods." 
                      isEnabled={settings.modules.paymentMethods.enabled} 
                      onToggle={() => handleModuleToggle('paymentMethods')}
                      icon={CreditCardIcon}
                    />
                    <Switch 
                      label="Debt Tracking" 
                      description="Track debts and shared expenses." 
                      isEnabled={settings.modules.debt?.enabled} 
                      onToggle={() => handleModuleToggle('debt')}
                      icon={UserGroupIcon}
                    />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'formatting' && (
              <div className="space-y-6">
                <div>
                  <SectionTitle title="Formatting" tooltip="Manage automatic text formatting and capitalization rules." />
                  <div className="space-y-4">
                    <Switch 
                      label="Capitalization Protection" 
                      description="Enforce capitalization rules for product names and brands." 
                      isEnabled={(settings.modules as any).capitalizationProtection?.enabled} 
                      onToggle={() => handleModuleToggle('capitalizationProtection')}
                    />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'pdf' && (<div className="space-y-4"><div><SectionTitle title="Receipt Export" tooltip="Customize the content included when exporting individual receipts to PDF." /><Switch label="Show Unique Item Count" description="Include the number of unique items on the receipt." isEnabled={settings.pdf.showUniqueItems} onToggle={() => handlePdfToggle('showUniqueItems')} /><div className="mt-3"><Switch label="Show Total Quantity" description="Include the total quantity of all items." isEnabled={settings.pdf.showTotalQuantity} onToggle={() => handlePdfToggle('showTotalQuantity')} /></div><div className="mt-3"><Switch label="Show Payment Method" description="Display the payment method used." isEnabled={settings.pdf.showPaymentMethod} onToggle={() => handlePdfToggle('showPaymentMethod')} /></div><div className="mt-3"><Switch label="Add Receipt Images" description="Include receipt images in the PDF." isEnabled={settings.pdf.addReceiptImages} onToggle={() => handlePdfToggle('addReceiptImages')} /></div></div><div><SectionTitle title="Bulk Export" tooltip="Settings for exporting multiple receipts at once." /><Switch label="Add Summary Page" description="Append a 'super-receipt' summarizing all receipts in a bulk export." isEnabled={settings.pdf.addSummaryPage} onToggle={() => handlePdfToggle('addSummaryPage')} /></div></div>)}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <Card>
                  <div className="p-4">
                    <SectionTitle title="Your Name" tooltip="This name is used on generated documents like PDF receipts to identify you." />
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Enter your name"
                        value={userName}
                        onChange={handleUserNameChange}
                        onBlur={handleUserNameSave}
                        className="w-full"
                      />
                      <Button onClick={handleUserNameSave}>Save</Button>
                    </div>
                  </div>
                </Card>
                <Card>
                  <div className="p-4">
                    <SectionTitle title="Datastore" tooltip="The location where this app will save all data. Preferrably placed in a folder which is backed up." />
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100">Datastore Folder</p>
                        <Tooltip content={tooltipText}>
                          <p 
                            className="text-sm text-gray-500 truncate cursor-pointer" 
                            onClick={handleCopyToClipboard}
                          >
                            {datastorePath || 'No folder selected'}
                          </p>
                        </Tooltip>
                      </div>
                      <Button onClick={handleSelectDatastore} className="flex-shrink-0 ml-4">Select Folder</Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <SectionTitle title="Database Backup" tooltip="Automatically back up your database." />
                    <button onClick={() => window.electronAPI.openBackupFolder()} className="text-xs text-blue-500 hover:underline">Open Backup Folder</button>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Backups</p>
                      <p className="text-sm text-gray-500">{backupCount} / {backupSettings.maxBackups}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="max-backups" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">Max Backups <Tooltip content="The maximum number of backups to keep."><InformationCircleIcon className="h-4 w-4 text-gray-400" /></Tooltip></label>
                          <Input id="max-backups" type="number" className="w-full mt-2" value={String(backupSettings.maxBackups)} onChange={(e) => handleBackupSettingChange('maxBackups', e.target.value)} />
                        </div>
                        <div>
                          <label htmlFor="backup-interval" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">Backup Interval <Tooltip content="Number of edits/additions before a new backup is made."><InformationCircleIcon className="h-4 w-4 text-gray-400" /></Tooltip></label>
                          <Input id="backup-interval" type="number" className="w-full mt-2" value={String(backupSettings.interval)} onChange={(e) => handleBackupSettingChange('interval', e.target.value)} />
                        </div>
                      </div>
                      <div className="text-right mt-2">
                        <Button variant="ghost" size="sm" onClick={resetBackupSettings} className="h-8 px-2 text-xs"><ArrowPathIcon className="h-3 w-3 mr-1" />Reset to Defaults</Button>
                      </div>
                    </div>
                    <Button onClick={triggerBackup} loading={isBackingUp} disabled={isBackingUp} className="w-full">Backup Now</Button>
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
                      <Button variant="danger" onClick={handleRemoveDatastore}>Reset</Button>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 mr-4">
                        <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          <TrashIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">Reset All Settings</p>
                          <p className="text-sm text-gray-500">Clear all settings and quit the application.</p>
                        </div>
                      </div>
                      <Button variant="danger" onClick={handleResetAllSettings}>Reset All</Button>
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
