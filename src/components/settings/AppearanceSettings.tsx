import React, { useState, useEffect } from 'react';
import { Moon, Sun, Info, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';
import Tooltip from '../ui/Tooltip';
import RadioCard from '../ui/RadioCard';
import { useSettingsStore } from '../../store/useSettingsStore';
import { BackgroundGradientAnimation } from '../ui/background-gradient-animation';
import Combobox from '../ui/Combobox';
import { themes } from '../../styles/themes';

const accentColors = [
  { name: 'Red', value: '#ef4444', class: 'bg-red-500' },
  { name: 'Orange', value: '#f97316', class: 'bg-orange-500' },
  { name: 'Yellow', value: '#eab308', class: 'bg-yellow-500' },
  { name: 'Green', value: '#22c55e', class: 'bg-green-500' },
  { name: 'Blue', value: '#007AFF', class: 'bg-blue-500' }, // Default macOS Blue
  { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
  { name: 'Violet', value: '#8b5cf6', class: 'bg-violet-500' },
  { name: 'Black', value: '#000000', class: 'bg-black border border-gray-700' },
  { name: 'White', value: '#FFFFFF', class: 'bg-white border border-gray-200' },
];

const headerColors = [
  { name: 'Red', value: '#ef4444', class: 'bg-red-500' },
  { name: 'Orange', value: '#f97316', class: 'bg-orange-500' },
  { name: 'Yellow', value: '#eab308', class: 'bg-yellow-500' },
  { name: 'Green', value: '#22c55e', class: 'bg-green-500' },
  { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
  { name: 'Violet', value: '#8b5cf6', class: 'bg-violet-500' }, // Default Violet
  { name: 'Black', value: '#000000', class: 'bg-black border border-gray-700' },
  { name: 'White', value: '#FFFFFF', class: 'bg-white border border-gray-200' },
];

interface ColorSelectorProps {
  title: string;
  tooltip: string;
  colors: { name: string; value: string; class: string }[];
  selectedColor: string;
  onColorChange: (color: string) => void;
  locked?: boolean;
  lockedMessage?: string;
  showCard?: boolean;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({
  title,
  tooltip,
  colors,
  selectedColor,
  onColorChange,
  locked = false,
  lockedMessage = "This setting is locked by the current theme.",
  showCard = true
}) => {
  return (
    <div className={cn("relative flex flex-col items-start gap-3 shrink-0 h-full justify-start w-full", showCard && "p-4 rounded-xl border border-border bg-bg-2")}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-font-1">{title}</span>
        <Tooltip content={tooltip}>
          <Info className="h-4 w-4 text-font-2 hover:text-font-1 cursor-help" />
        </Tooltip>
      </div>
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => (
          <button
            key={color.name}
            onClick={() => !locked && onColorChange(color.value)}
            className={cn(
              "w-8 h-8 rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 shrink-0",
              color.class,
              selectedColor === color.value ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110" : "",
              !locked && "hover:scale-110",
              locked && "cursor-not-allowed"
            )}
            title={color.name}
            aria-label={`Select ${color.name} color`}
            disabled={locked}
          />
        ))}
      </div>
      {locked && (
        <div className={cn("absolute inset-0 z-10 flex items-center justify-center", showCard ? "bg-bg-2/50 backdrop-blur-sm rounded-xl" : "bg-bg/50 backdrop-blur-sm")}>
          <Tooltip content={lockedMessage}>
            <Lock className="h-6 w-6 text-font-2" />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

interface AppearanceSettingsProps {
  showPreview?: boolean;
  showTitle?: boolean;
  showCard?: boolean;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ showPreview = true, showTitle = true, showCard = true }) => {
  const { settings, updateSettings } = useSettingsStore();
  const [accentColor, setAccentColor] = useState(settings.themeColor || '#007AFF');
  const [headerColor, setHeaderColor] = useState(settings.headerColor || '#8b5cf6');
  const [selectedThemeId, setSelectedThemeId] = useState(settings.theme || 'system');

  const currentTheme = themes[selectedThemeId];
  const isAccentLocked = currentTheme?.lockedAccent || false;
  const isHeaderLocked = currentTheme?.lockedHeader || false;

  useEffect(() => {
    if (settings.themeColor) {
      setAccentColor(settings.themeColor);
    }
    if (settings.headerColor) {
      setHeaderColor(settings.headerColor);
    }
    if (settings.theme) {
      setSelectedThemeId(settings.theme);
    }
  }, [settings.themeColor, settings.headerColor, settings.theme]);

  const handleThemeChange = (newTheme: string) => {
    setSelectedThemeId(newTheme);
    const theme = themes[newTheme];
    
    const updates: any = { theme: newTheme };
    updateSettings(updates);
  };

  const handleAccentColorChange = (color: string) => {
    if (isAccentLocked) return;
    setAccentColor(color);
    updateSettings({ themeColor: color });
  };

  const handleHeaderColorChange = (color: string) => {
    if (isHeaderLocked) return;
    setHeaderColor(color);
    updateSettings({ headerColor: color });
  };

  const SectionTitle = ({ title, tooltip }: { title: string, tooltip?: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-lg font-medium text-font-1">{title}</h3>
      {tooltip && <Tooltip content={tooltip}><Info className="h-5 w-5 text-font-2 hover:text-font-1 cursor-help" /></Tooltip>}
    </div>
  );

  const otherThemes = Object.values(themes).filter(t => !['light', 'dark'].includes(t.id));

  return (
    <div className={cn(!showCard && "contents")}>
      {showTitle && <SectionTitle title="Theme" tooltip="Customize the look and feel of the application." />}
      
      {/* Preview removed completely as requested */}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <RadioCard
          selected={selectedThemeId === 'light'}
          onClick={() => handleThemeChange('light')}
          title="Light Mode"
          description="Bright and shiny"
          icon={<Sun className="h-6 w-6" />}
        />
        <RadioCard
          selected={selectedThemeId === 'dark'}
          onClick={() => handleThemeChange('dark')}
          title="Dark Mode"
          description="Easier on the eyes"
          icon={<Moon className="h-6 w-6" />}
        />
      </div>

      <div className="mb-6">
        <Combobox
          value={['light', 'dark'].includes(selectedThemeId) ? '' : selectedThemeId}
          onChange={handleThemeChange}
          options={otherThemes.map(t => ({ value: t.id, label: t.name }))}
          placeholder="Or select an alternative theme..."
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ColorSelector
            title="Accent Color"
            tooltip="Changes the primary color used for buttons, links, and active states."
            colors={accentColors}
            selectedColor={accentColor}
            onColorChange={handleAccentColorChange}
            locked={isAccentLocked}
            lockedMessage="This theme does not allow customisation of the accent color."
            showCard={showCard}
        />

        <ColorSelector
            title="Header Animation Color"
            tooltip="Changes the base color of the animated header background."
            colors={headerColors}
            selectedColor={headerColor}
            onColorChange={handleHeaderColorChange}
            locked={isHeaderLocked}
            lockedMessage="This theme does not allow customisation of the header color."
            showCard={showCard}
        />
      </div>
    </div>
  );
};

export default AppearanceSettings;
