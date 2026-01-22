import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Moon, Sun, RotateCw, Bug, CreditCard, Trash2, Info, Plug, Users, AlertTriangle, CheckCircle, AlertCircle as AlertCircleIcon, HelpCircle, ClipboardList, Clipboard, Paperclip, Clock, Palette, FileText, Database, Type, Code, PlayCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';
import ErrorModal from '../ui/ErrorModal';
import Tooltip from '../ui/Tooltip';
import Input from '../ui/Input';
import Switch from '../ui/Switch';
import '../../electron.d';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useBackupStore } from '../../store/useBackupStore';
import StepperInput from '../ui/StepperInput';
import { format } from 'date-fns';
import AppearanceSettings from './AppearanceSettings';
import FormattingSettings from './FormattingSettings';
import { wizardState } from '../../settings/wizardState';
import { ModulesComponent } from '../../preferences/modules/ModulesComponent';
import WizardDevTools from './WizardDevTools';

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
  const [mockTimeDate, setMockTimeDate] = useState('');
  const [mockTimeTime, setMockTimeTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    setIsDev(process.env.NODE_ENV === 'development');
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
    if (settings.dev?.mockTime?.date) {
      const date = new Date(settings.dev.mockTime.date);
      setMockTimeDate(format(date, 'yyyy-MM-dd'));
      setMockTimeTime(format(date, 'HH:mm'));
    } else {
      const now = new Date();
      setMockTimeDate(format(now, 'yyyy-MM-dd'));
      setMockTimeTime(format(now, 'HH:mm'));
    }
  }, [settings]);

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

  const handleIndicatorToggle = (key: 'debt' | 'tentative' | 'type' | 'attachments') => {
    const defaults = { debt: false, tentative: false, type: false, attachments: false };
    const currentIndicators = { ...defaults, ...(settings.receipts?.indicators || {}) };
    const newIndicators = { ...currentIndicators, [key]: !currentIndicators[key] };
    // cast to expected shape to satisfy TS
    const typedIndicators = newIndicators as unknown as import('../../types').Settings['receipts']['indicators'];
    updateSettings({ receipts: { ...settings.receipts, indicators: typedIndicators } });
  };

  const handlePdfToggle = (key: string) => {
    const newPdfSettings = { ...settings.pdf, [key]: !(settings.pdf as any)[key] };
    updateSettings({ pdf: newPdfSettings });
  };

  const handleBackupSettingChange = (key: string, value: number) => {
    const newBackupSettings = { ...backupSettings, [key]: value };
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
      if (window.electronAPI.quitApp) {
        await window.electronAPI.quitApp();
      }
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(datastorePath);
    setTooltipText('Copied!');
    setTimeout(() => setTooltipText(datastorePath), 2000);
  };

  const handleMockTimeToggle = () => {
    const enabled = !settings.dev?.mockTime?.enabled;
    const date = enabled ? (settings.dev?.mockTime?.date || new Date().toISOString()) : null;
    updateSettings({ dev: { ...settings.dev, mockTime: { enabled, date } } });
  };

  const handleMockTimeSet = () => {
    if (mockTimeDate && mockTimeTime) {
      const newDate = new Date(`${mockTimeDate}T${mockTimeTime}`);
      updateSettings({ dev: { ...settings.dev, mockTime: { ...settings.dev?.mockTime, date: newDate.toISOString() } } });
    }
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'formatting', label: 'Formatting', icon: Type },
    { id: 'modules', label: 'Modules', icon: Plug },
    { id: 'pdf', label: 'PDF', icon: FileText },
    { id: 'development', label: 'Development', icon: Code }, // Always show Development tab
  ];

  tabs.sort((a, b) => a.label.localeCompare(b.label));

  const SectionTitle = ({ title, tooltip }: { title: string, tooltip?: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-lg font-medium text-font-1">{title}</h3>
      {tooltip && <Tooltip content={tooltip}><Info className="h-5 w-5 text-font-2 hover:text-font-1 cursor-help" /></Tooltip>}
    </div>
  );

  // Compact indicator definitions used by the receipts UI. Keep headers' icon colors identical to the table headers.
  const indicatorDefs = [
    {
      key: 'debt',
      header: <div className="flex flex-col items-center gap-1"><AlertTriangle className="h-5 w-5 text-yellow" /><AlertCircleIcon className="h-5 w-5 text-red" /><CheckCircle className="h-5 w-5 text-green" /></div>,
      title: 'Debt',
      desc: 'Marks items that are part of a split or debt.',
      enabled: settings.receipts?.indicators.debt ?? false,
      hidden: !settings.modules.debt?.enabled,
    },
    {
      key: 'tentative',
      header: <HelpCircle className="h-5 w-5 text-font-2" />,
      title: 'Tentative',
      desc: 'Marks expenses or items as drafts/tentative.',
      enabled: settings.receipts?.indicators.tentative ?? false,
    },
    {
      key: 'type',
      header: <div className="flex flex-col items-center gap-1"><ClipboardList className="h-5 w-5 text-font-2" /><Clipboard className="h-5 w-5 text-font-2" /></div>,
      title: 'Receipt Type',
      desc: 'Indicates if an expense is total-only or detailed.',
      enabled: settings.receipts?.indicators.type ?? false,
    },
    {
      key: 'attachments',
      header: <Paperclip className="h-5 w-5 text-font-2" />,
      title: 'Attachments',
      desc: 'Indicates the presence of attached images or receipt files.',
      enabled: settings.receipts?.indicators.attachments ?? false,
    },
  ].filter(d => !d.hidden);

  // fix TypeScript inference for indicator toggles
  const indicatorToggleHandlers = {
    debt: () => handleIndicatorToggle('debt'),
    tentative: () => handleIndicatorToggle('tentative'),
    type: () => handleIndicatorToggle('type'),
    attachments: () => handleIndicatorToggle('attachments'),
  } as const;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="xlh" onEnter={onClose}>
        <div className="flex h-full">
          <div className="w-56 border-r border-border pr-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)} 
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3", 
                      activeTab === tab.id 
                        ? "bg-field-hover text-font-1 shadow-sm" 
                        : "text-font-2 hover:bg-field-hover hover:text-font-1"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", activeTab === tab.id ? "text-accent" : "text-font-2")} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex-1 px-8 overflow-y-auto">
            {activeTab === 'appearance' && (
              <div>
                <AppearanceSettings />
                
                <div className="h-px bg-border my-6" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-font-1">UI Scale</h3>
                      <Tooltip content="Adjust the size of text and other interface elements."><Info className="h-5 w-5 text-font-2 hover:text-font-1 cursor-help" /></Tooltip>
                    </div>
                    <button onClick={resetUiScale} className="text-xs text-font-2 hover:text-font-1 underline">reset</button>
                  </div>
                  <div className="flex items-center gap-4"><input type="range" min="50" max="200" step="10" value={uiScale} onChange={handleUiScaleChange} onMouseUp={handleUiScaleSave} className="w-full h-2 bg-field rounded-lg appearance-none cursor-pointer border border-border" /><span className="text-sm font-medium text-font-1 w-12 text-right">{uiScale}%</span></div>
                </div>
                
                <div className="h-px bg-border my-6" />
                
                <div>
                  <SectionTitle title="Expense Indicators" tooltip="Toggle visibility of indicator icons on the expense list." />
                  <div className="space-y-2">
                    {indicatorDefs.map((d) => (
                      <div key={d.key} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 py-2">
                        <div className="flex items-center justify-center">{d.header}</div>
                        <div>
                          <div className="font-medium text-sm text-font-1">{d.title}</div>
                          <div className="text-xs text-font-2">{d.desc}</div>
                        </div>
                        <div className="flex items-center justify-end">
                          <Switch isEnabled={d.enabled} onToggle={() => handleIndicatorToggle(d.key as any)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'modules' && (
              <div className="space-y-6">
                <div>
                  <SectionTitle title="Modules" tooltip="Enable or disable optional features to customize your experience." />
                  <ModulesComponent settings={settings} onToggle={handleModuleToggle} />
                </div>
              </div>
            )}
            {activeTab === 'formatting' && (
              <div className="space-y-6">
                <FormattingSettings />

                <div className="h-px bg-border my-6" />

                <div>
                  <SectionTitle title="Formatting" tooltip="Manage automatic text formatting and capitalization rules." />
                  <div className="space-y-4">
                    <Switch 
                      label="Capitalization Protection" 
                      description="Enforce capitalization rules for product names and brands." 
                      isEnabled={settings.modules.capitalizationProtection?.enabled ?? false}
                      onToggle={() => handleModuleToggle('capitalizationProtection')}
                      className="border-0 p-0"
                    />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'pdf' && (
              <div>
                <div>
                  <SectionTitle title="Expense Export" tooltip="Customize the content included when exporting individual expenses to PDF." />
                  <div className="space-y-3">
                    <Switch label="Show Unique Item Count" description="Include the number of unique items on the expense." isEnabled={settings.pdf.showUniqueItems} onToggle={() => handlePdfToggle('showUniqueItems')} className="border-0 p-0" />
                    <Switch label="Show Total Quantity" description="Include the total quantity of all items." isEnabled={settings.pdf.showTotalQuantity} onToggle={() => handlePdfToggle('showTotalQuantity')} className="border-0 p-0" />
                    <Switch label="Show Payment Method" description="Display the payment method used." isEnabled={settings.pdf.showPaymentMethod} onToggle={() => handlePdfToggle('showPaymentMethod')} className="border-0 p-0" />
                    <Switch label="Add Expense Images" description="Include expense images in the PDF." isEnabled={settings.pdf.addReceiptImages} onToggle={() => handlePdfToggle('addReceiptImages')} className="border-0 p-0" />
                  </div>
                </div>
                
                <div className="h-px bg-border my-6" />
                
                <div>
                  <SectionTitle title="Bulk Export" tooltip="Settings for exporting multiple expenses at once." />
                  <div className="space-y-3">
                    <Switch label="Add Summary Page" description="Append a 'super-expense' summarizing all expenses in a bulk export." isEnabled={settings.pdf.addSummaryPage} onToggle={() => handlePdfToggle('addSummaryPage')} className="border-0 p-0" />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'data' && (
              <div>
                <div>
                  <SectionTitle title="Your Name" tooltip="This name is used on generated documents like PDF expenses to identify you." />
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
                
                <div className="h-px bg-border my-6" />

                <div>
                  <SectionTitle title="Datastore" tooltip="The location where this app will save all data. Preferrably placed in a folder which is backed up." />
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-medium text-font-1">Datastore Folder</p>
                      <Tooltip content={tooltipText} className="block">
                        <p 
                          className="text-sm text-font-2 truncate cursor-pointer" 
                          onClick={handleCopyToClipboard}
                        >
                          {datastorePath || 'No folder selected'}
                        </p>
                      </Tooltip>
                    </div>
                    <Button onClick={handleSelectDatastore} className="flex-shrink-0">Select Folder</Button>
                  </div>
                </div>

                <div className="h-px bg-border my-6" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium text-font-1">Backup</h3>
                        <Tooltip content="Automatically back up your database."><Info className="h-5 w-5 text-font-2 hover:text-font-1 cursor-help" /></Tooltip>
                        <span className="text-sm text-font-2 ml-2">({backupCount}/{backupSettings.maxBackups})</span>
                    </div>
                    <button onClick={resetBackupSettings} className="text-xs text-font-2 hover:text-font-1 underline">reset</button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="max-backups" className="text-sm font-medium text-font-1 flex items-center gap-1 mb-2">Max Backups <Tooltip content="The maximum number of backups to keep."><Info className="h-4 w-4 text-font-2" /></Tooltip></label>
                        <StepperInput id="max-backups" min={1} max={50} value={String(backupSettings.maxBackups)} onChange={(e) => handleBackupSettingChange('maxBackups', Number(e.target.value))} onIncrement={() => handleBackupSettingChange('maxBackups', Math.min(50, backupSettings.maxBackups + 1))} onDecrement={() => handleBackupSettingChange('maxBackups', Math.max(1, backupSettings.maxBackups - 1))} />
                      </div>
                      <div>
                        <label htmlFor="backup-interval" className="text-sm font-medium text-font-1 flex items-center gap-1 mb-2">Backup Interval <Tooltip content="Number of edits/additions before a new backup is made."><Info className="h-4 w-4 text-font-2" /></Tooltip></label>
                        <StepperInput id="backup-interval" min={1} max={50} value={String(backupSettings.interval)} onChange={(e) => handleBackupSettingChange('interval', Number(e.target.value))} onIncrement={() => handleBackupSettingChange('interval', Math.min(50, backupSettings.interval + 1))} onDecrement={() => handleBackupSettingChange('interval', Math.max(1, backupSettings.interval - 1))} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <button onClick={() => window.electronAPI?.openBackupFolder()} className="text-xs text-blue hover:underline">Open Backup Folder</button>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={triggerBackup} loading={isBackingUp} disabled={isBackingUp}>Backup Now</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'development' && (
              <div>
                <WizardDevTools />

                {isDev && (
                  <>
                    <div className="h-px bg-border my-6" />

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 mr-4">
                          <div className="p-2 rounded-lg bg-red/20 text-red">
                            <Bug className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-medium text-font-1">Test Error Modal</p>
                            <p className="text-sm text-font-2">Generate a fake error to test the error modal.</p>
                          </div>
                        </div>
                        <Button variant="danger" onClick={handleGenerateError}>Generate Error</Button>
                      </div>
                    </div>
                    
                    <div className="h-px bg-border my-6" />
                    
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 mr-4">
                          <div className="p-2 rounded-lg bg-yellow/20 text-yellow">
                            <Trash2 className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-medium text-font-1">Reset Datastore</p>
                            <p className="text-sm text-font-2">Remove the datastore folder path from settings.</p>
                          </div>
                        </div>
                        <Button variant="danger" onClick={handleRemoveDatastore}>Reset</Button>
                      </div>
                    </div>
                    
                    <div className="h-px bg-border my-6" />
                    
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 mr-4">
                          <div className="p-2 rounded-lg bg-red/20 text-red">
                            <Trash2 className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-medium text-font-1">Reset All Settings</p>
                            <p className="text-sm text-font-2">Clear all settings and quit the application.</p>
                          </div>
                        </div>
                        <Button variant="danger" onClick={handleResetAllSettings}>Reset All</Button>
                      </div>
                    </div>

                    <div className="h-px bg-border my-6" />

                    <div>
                      <SectionTitle title="Mock Time" tooltip="Simulate a different date and time for testing recurring events." />
                      <div className="space-y-4">
                        <Switch
                          label="Enable Mock Time"
                          description="Override the system time with a custom date and time."
                          isEnabled={settings.dev?.mockTime?.enabled ?? false}
                          onToggle={handleMockTimeToggle}
                          icon={Clock}
                        />
                        <div className={cn("grid grid-cols-2 gap-4 transition-opacity", !(settings.dev?.mockTime?.enabled) && "opacity-50 pointer-events-none")}>
                          <Input
                            type="date"
                            label="Date"
                            value={mockTimeDate}
                            onChange={(e) => setMockTimeDate(e.target.value)}
                            disabled={!settings.dev?.mockTime?.enabled}
                          />
                          <div className="flex items-end gap-2">
                            <Input
                              type="time"
                              label="Time"
                              value={mockTimeTime}
                              onChange={(e) => setMockTimeTime(e.target.value)}
                              disabled={!settings.dev?.mockTime?.enabled}
                              className="flex-1"
                            />
                            <Button onClick={handleMockTimeSet} disabled={!settings.dev?.mockTime?.enabled}>Set</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
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
