import React from 'react';
import { Info, Clock } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import RadioCard from '../ui/RadioCard';
import TimeDisplay from '../ui/TimeDisplay';
import Switch from '../ui/Switch';
import { useSettingsStore } from '../../store/useSettingsStore';
import { cn } from '../../utils/cn';

interface TimeSettingsProps {
  showPreview?: boolean;
  showCard?: boolean;
  showTitle?: boolean;
}

const TimeSettings: React.FC<TimeSettingsProps> = ({ showPreview = true, showCard = true, showTitle = true }) => {
  const { settings, updateSettings } = useSettingsStore();

  const handleTimeFormatChange = (format: 'international' | 'american') => {
    updateSettings({ formatting: { ...settings.formatting, timeFormat: format } });
  };

  const toggleShowSeconds = () => {
    updateSettings({ formatting: { ...settings.formatting, showSeconds: !settings.formatting?.showSeconds } });
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
    <div className={cn("mb-6 flex justify-center", showCard && "p-4 rounded-xl border border-border bg-field-disabled")}>
      <div className={cn("text-center inline-block", !showCard && "p-4 rounded-xl border border-border bg-field-disabled min-w-[200px]")}>
        <div className="text-2xl font-bold text-font-1">
          {children}
        </div>
      </div>
    </div>
  );

  const previewDate = new Date(2024, 11, 24, 14, 30, 45); // Dec 24, 2024, 14:30:45

  return (
    <div>
      <div className="flex items-center justify-between">
        {showTitle && <SectionTitle title="Time Display" tooltip="Choose how time is displayed across the app." />}
        {showPreview && <PreviewHeader tooltip="This preview shows how time will be formatted." />}
      </div>
      
      {showPreview && (
        <PreviewBox>
          <TimeDisplay date={previewDate} />
        </PreviewBox>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <RadioCard
          selected={settings.formatting?.timeFormat !== 'american'}
          onClick={() => handleTimeFormatChange('international')}
          title="International"
          description="24-hour format"
          icon={<Clock className="h-6 w-6" />}
        />
        <RadioCard
          selected={settings.formatting?.timeFormat === 'american'}
          onClick={() => handleTimeFormatChange('american')}
          title="American"
          description="12-hour format (AM/PM)"
          icon={<Clock className="h-6 w-6" />}
        />
      </div>
      <Switch
        label="Show Seconds"
        description="Include seconds in time display"
        isEnabled={!!settings.formatting?.showSeconds}
        onToggle={toggleShowSeconds}
      />
    </div>
  );
};

export default TimeSettings;
