import React from 'react';
import { Info, Calendar } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import RadioCard from '../ui/RadioCard';
import DateDisplay from '../ui/DateDisplay';
import Switch from '../ui/Switch';
import { useSettingsStore } from '../../store/useSettingsStore';
import { cn } from '../../utils/cn';

interface DateSettingsProps {
  showPreview?: boolean;
  showCard?: boolean;
  showTitle?: boolean;
}

const DateSettings: React.FC<DateSettingsProps> = ({ showPreview = true, showCard = true, showTitle = true }) => {
  const { settings, updateSettings } = useSettingsStore();

  const handleDateFormatChange = (format: 'international' | 'american') => {
    updateSettings({ formatting: { ...settings.formatting, dateFormat: format } });
  };

  const toggleShortenYear = () => {
    updateSettings({ formatting: { ...settings.formatting, shortenYear: !settings.formatting?.shortenYear } });
  };

  const SectionTitle = ({ title, tooltip }: { title: string, tooltip?: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-lg font-medium text-font-1">{title}</h3>
      {tooltip && <Tooltip content={tooltip}><Info className="h-5 w-5 text-font-2 hover:text-font-1 cursor-help" /></Tooltip>}
    </div>
  );

  const PreviewHeader = ({ tooltip }: { tooltip: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-xs text-font-2 uppercase tracking-wider font-semibold">Preview</span>
      <Tooltip content={tooltip}>
        <Info className="h-4 w-4 text-font-2 cursor-help" />
      </Tooltip>
    </div>
  );

  const PreviewBox = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-6 flex justify-center">
      <div className="text-center min-w-[280px] p-4 rounded-xl border border-border bg-field-disabled">
        <div className="text-2xl font-bold text-font-1">
          {children}
        </div>
      </div>
    </div>
  );

  const previewDate = new Date(2024, 11, 24, 14, 30, 45); // Dec 24, 2024, 14:30:45

  return (
    <div>
      {(showTitle || showPreview) && (
        <div className="flex items-center justify-between">
          {showTitle && <SectionTitle title="Date Display" tooltip="Choose how dates are displayed across the app." />}
          {showPreview && showTitle && <PreviewHeader tooltip="This preview shows how dates will be formatted." />}
        </div>
      )}
      
      {showPreview && (
        <PreviewBox>
          <DateDisplay date={previewDate} />
        </PreviewBox>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <RadioCard
          selected={settings.formatting?.dateFormat !== 'american'}
          onClick={() => handleDateFormatChange('international')}
          title="International"
          description="DD/MM/YYYY"
          icon={<Calendar className="h-6 w-6" />}
        />
        <RadioCard
          selected={settings.formatting?.dateFormat === 'american'}
          onClick={() => handleDateFormatChange('american')}
          title="American"
          description="MM/DD/YYYY"
          icon={<Calendar className="h-6 w-6" />}
        />
      </div>
      <Switch
        label="Shorten Year"
        description="Display year as YY instead of YYYY"
        isEnabled={!!settings.formatting?.shortenYear}
        onToggle={toggleShortenYear}
        className="border-0 p-0"
      />
    </div>
  );
};

export default DateSettings;
