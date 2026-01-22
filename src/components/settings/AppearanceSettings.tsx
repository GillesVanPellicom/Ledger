import React, { useState, useEffect } from 'react';
import { Moon, Sun, Info, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';
import Tooltip from '../ui/Tooltip';
import RadioCard from '../ui/RadioCard';
import { useSettingsStore } from '../../store/useSettingsStore';
import { BackgroundGradientAnimation } from '../ui/background-gradient-animation';
import Select from '../ui/Select';
import { themes } from '../../styles/themes';

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

interface ColorSelectorProps {
  title: string;
  tooltip: string;
  colors: { name: string; value: string; class: string }[];
  selectedColor: string;
  onColorChange: (color: string) => void;
  locked?: boolean;
  lockedMessage?: string;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({
  title,
  tooltip,
  colors,
  selectedColor,
  onColorChange,
  locked = false,
  lockedMessage = "This setting is locked by the current theme."
}) => {
  return (
    <div className="relative p-4 rounded-xl border border-border bg-bg-2 flex flex-col items-center gap-3 shrink-0 h-full justify-start">
      <Tooltip content={`${title}: ${tooltip}`}>
        <Info className="h-5 w-5 text-font-2 hover:text-font-1 cursor-help" />
      </Tooltip>
      <div className="flex flex-col gap-3">
        {colors.map((color) => (
          <button
            key={color.name}
            onClick={() => !locked && onColorChange(color.value)}
            className={cn(
              "w-8 h-8 rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
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
        <div className="absolute inset-0 bg-bg-2/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
          <Tooltip content={lockedMessage}>
            <Lock className="h-6 w-6 text-font-2" />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

const AppearanceSettings: React.FC = () => {
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

    // If the new theme locks the accent, we don't update the stored themeColor.
    // The store will handle applying the theme's default accent color visually.
    // If the new theme does NOT lock the accent, we don't need to do anything special,
    // the store will revert to using the stored themeColor.
    
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
    <div>
      <SectionTitle title="Theme" tooltip="Customize the look and feel of the application." />
      
      <div className="flex items-stretch gap-4 mb-4">
        {/* UI Mock Preview */}
        <div className="flex-grow flex flex-col">
            <div className="flex items-center gap-2 mb-4 pt-4">
                <h4 className="text-sm font-medium text-font-2">Theme Preview</h4>
                <Tooltip content="A live preview of how your chosen colors and theme will look in the application.">
                    <Info className="h-4 w-4 text-font-2 hover:text-font-1 cursor-help" />
                </Tooltip>
            </div>
            <div className="flex-grow p-4 rounded-xl border border-border bg-bg flex flex-col gap-3 transition-colors duration-300">
                {/* Mock Header with Animation */}
                <div className="h-10 rounded-lg overflow-hidden relative shadow-sm border border-border shrink-0">
                <BackgroundGradientAnimation 
                    containerClassName="absolute inset-0"
                    size="60%"
                    className="absolute inset-0 flex items-center px-3"
                    interactive={false}
                    forceColor={headerColor}
                >
                    <div className="z-10 w-full flex justify-between items-center">
                        <div className="h-2.5 w-12 bg-white/20 rounded-full backdrop-blur-sm"></div>
                        <div className="h-5 w-5 rounded-full bg-white/20 backdrop-blur-sm"></div>
                    </div>
                </BackgroundGradientAnimation>
                </div>

                <div className="flex gap-3 flex-grow overflow-hidden">
                    {/* Mock Sidenav (Collapsed) */}
                    <div className="w-10 flex flex-col items-center gap-3 py-1 border-r border-border/50 shrink-0">
                        <div className="p-1.5 rounded-md bg-accent/10">
                            <div className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: accentColor }}></div>
                        </div>
                        <div className="p-1.5">
                            <div className="h-3.5 w-3.5 rounded-sm bg-font-2/20"></div>
                        </div>
                        <div className="p-1.5">
                            <div className="h-3.5 w-3.5 rounded-sm bg-font-2/20"></div>
                        </div>
                    </div>

                    {/* Mock Content */}
                    <div className="flex-1 flex flex-col gap-3 min-w-0">
                        <div className="p-3 rounded-lg bg-bg-2 border border-border shadow-sm flex-1 flex flex-col gap-3 overflow-hidden">
                            <div className="flex justify-between items-center">
                                <div className="h-3 w-16 bg-font-1/20 rounded-full"></div>
                                <div className="h-3.5 w-8 bg-accent/20 rounded-full"></div>
                            </div>
                            <div className="h-px w-full bg-border"></div>
                            
                            {/* Mock Table */}
                            <div className="space-y-3 mt-1">
                                <div className="flex justify-between items-center">
                                    <div className="h-2 w-20 bg-font-2/20 rounded-full"></div>
                                    <div className="h-2 w-10 bg-font-1/20 rounded-full"></div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="h-2 w-16 bg-font-2/20 rounded-full"></div>
                                    <div className="h-2 w-12 bg-font-1/20 rounded-full"></div>
                                </div>
                            </div>

                            {/* Mock Button */}
                            <div className="mt-auto flex justify-end">
                                <div className="h-6 w-14 rounded-md shadow-sm" style={{ backgroundColor: accentColor }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex gap-4 shrink-0">
          <ColorSelector
              title="Accent Color"
              tooltip="Changes the primary color used for buttons, links, and active states."
              colors={accentColors}
              selectedColor={accentColor}
              onColorChange={handleAccentColorChange}
              locked={isAccentLocked}
              lockedMessage="This theme does not allow customisation of the accent color."
          />

          <ColorSelector
              title="Header Animation Color"
              tooltip="Changes the base color of the animated header background."
              colors={headerColors}
              selectedColor={headerColor}
              onColorChange={handleHeaderColorChange}
              locked={isHeaderLocked}
              lockedMessage="This theme does not allow customisation of the header color."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <RadioCard
          selected={selectedThemeId === 'light'}
          onClick={() => handleThemeChange('light')}
          title="Light Mode"
          description="Default appearance"
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
        <Select
          value={['light', 'dark'].includes(selectedThemeId) ? '' : selectedThemeId}
          onChange={(e) => handleThemeChange(e.target.value)}
          options={otherThemes.map(t => ({ value: t.id, label: t.name }))}
          placeholder="Or select an alternative theme..."
          className="w-full"
        />
      </div>
    </div>
  );
};

export default AppearanceSettings;
