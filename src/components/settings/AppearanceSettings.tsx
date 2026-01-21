import React, { useState, useEffect } from 'react';
import { Moon, Sun, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import Tooltip from '../ui/Tooltip';
import RadioCard from '../ui/RadioCard';
import { useSettingsStore } from '../../store/useSettingsStore';
import { BackgroundGradientAnimation } from '../ui/background-gradient-animation';

const accentColors = [
  { name: 'Red', value: '#ef4444', class: 'bg-red-500' },
  { name: 'Orange', value: '#f97316', class: 'bg-orange-500' },
  { name: 'Yellow', value: '#eab308', class: 'bg-yellow-500' },
  { name: 'Green', value: '#22c55e', class: 'bg-green-500' },
  { name: 'Blue', value: '#007AFF', class: 'bg-blue-500' }, // Default macOS Blue
  { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
  { name: 'Violet', value: '#8b5cf6', class: 'bg-violet-500' },
];

const headerColors = [
  { name: 'Red', value: '#ef4444', class: 'bg-red-500' },
  { name: 'Orange', value: '#f97316', class: 'bg-orange-500' },
  { name: 'Yellow', value: '#eab308', class: 'bg-yellow-500' },
  { name: 'Green', value: '#22c55e', class: 'bg-green-500' },
  { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
  { name: 'Violet', value: '#8b5cf6', class: 'bg-violet-500' }, // Default Violet
];

const AppearanceSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const [accentColor, setAccentColor] = useState(settings.themeColor || '#007AFF');
  const [headerColor, setHeaderColor] = useState(settings.headerColor || '#8b5cf6');

  useEffect(() => {
    if (settings.themeColor) {
      setAccentColor(settings.themeColor);
      document.documentElement.style.setProperty('--color-accent', settings.themeColor);
    }
    if (settings.headerColor) {
      setHeaderColor(settings.headerColor);
    }
  }, [settings.themeColor, settings.headerColor]);

  const handleThemeChange = (newTheme: string) => {
    updateSettings({ theme: newTheme });
  };

  const handleAccentColorChange = (color: string) => {
    setAccentColor(color);
    updateSettings({ themeColor: color });
    document.documentElement.style.setProperty('--color-accent', color);
  };

  const handleHeaderColorChange = (color: string) => {
    setHeaderColor(color);
    updateSettings({ headerColor: color });
  };

  const SectionTitle = ({ title, tooltip }: { title: string, tooltip?: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
      {tooltip && <Tooltip content={tooltip}><Info className="h-5 w-5 text-gray-400 hover:text-gray-500 cursor-help" /></Tooltip>}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle title="Theme" tooltip="Customize the look and feel of the application." />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Preview</span>
          <Tooltip content="This preview shows how the selected theme and colors will look in the application.">
            <Info className="h-4 w-4 text-gray-400 cursor-help" />
          </Tooltip>
        </div>
      </div>
      
      {/* UI Mock Preview */}
      <div className="mb-6 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-4 transition-colors duration-300 scale-90 origin-top">
        {/* Mock Header with Animation */}
        <div className="h-16 rounded-lg overflow-hidden relative shadow-sm border border-gray-200 dark:border-gray-700">
           <BackgroundGradientAnimation 
             containerClassName="absolute inset-0"
             size="60%"
             className="absolute inset-0 flex items-center px-4"
             interactive={false}
             forceColor={headerColor}
           >
             <div className="z-10 w-full flex justify-between items-center">
                <div className="h-4 w-32 bg-white/20 rounded backdrop-blur-sm"></div>
                <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm"></div>
             </div>
           </BackgroundGradientAnimation>
        </div>

        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-1/3 space-y-3">
            <div className="h-24 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-3">
               <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
               <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="h-24 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-3">
               <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
               <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
          <div className="w-2/3">
             <div className="h-full rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                   <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                   <div className="h-8 w-20 rounded-md" style={{ backgroundColor: accentColor }}></div>
                </div>
                <div className="h-px w-full bg-gray-100 dark:bg-gray-700"></div>
                <div className="space-y-2">
                   <div className="h-3 w-full bg-gray-100 dark:bg-gray-700/50 rounded"></div>
                   <div className="h-3 w-5/6 bg-gray-100 dark:bg-gray-700/50 rounded"></div>
                   <div className="h-3 w-4/6 bg-gray-100 dark:bg-gray-700/50 rounded"></div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <RadioCard
          selected={settings.theme === 'light'}
          onClick={() => handleThemeChange('light')}
          title="Light Mode"
          description="Default appearance"
          icon={<Sun className="h-6 w-6" />}
        />
        <RadioCard
          selected={settings.theme === 'dark'}
          onClick={() => handleThemeChange('dark')}
          title="Dark Mode"
          description="Easier on the eyes"
          icon={<Moon className="h-6 w-6" />}
        />
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Accent Color</h4>
          <Tooltip content="Changes the primary color used for buttons, links, and active states.">
            <Info className="h-4 w-4 text-gray-400 hover:text-gray-500 cursor-help" />
          </Tooltip>
        </div>
        <div className="flex flex-wrap gap-3">
          {accentColors.map((color) => (
            <button
              key={color.name}
              onClick={() => handleAccentColorChange(color.value)}
              className={cn(
                "w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
                color.class,
                accentColor === color.value ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110" : ""
              )}
              title={color.name}
              aria-label={`Select ${color.name} accent color`}
            />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Header Animation Color</h4>
          <Tooltip content="Changes the base color of the animated header background.">
            <Info className="h-4 w-4 text-gray-400 hover:text-gray-500 cursor-help" />
          </Tooltip>
        </div>
        <div className="flex flex-wrap gap-3">
          {headerColors.map((color) => (
            <button
              key={color.name}
              onClick={() => handleHeaderColorChange(color.value)}
              className={cn(
                "w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
                color.class,
                headerColor === color.value ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110" : ""
              )}
              title={color.name}
              aria-label={`Select ${color.name} header color`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
