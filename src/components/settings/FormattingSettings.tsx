import React from 'react';
import { Info } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import RadioCard from '../ui/RadioCard';
import MoneyDisplay from '../ui/MoneyDisplay';
import { useSettingsStore } from '../../store/useSettingsStore';

const FormattingSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();

  const handleDecimalSeparatorChange = (separator: 'dot' | 'comma') => {
    updateSettings({ formatting: { ...settings.formatting, decimalSeparator: separator } });
  };

  const SectionTitle = ({ title, tooltip }: { title: string, tooltip?: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-lg font-medium text-font-1">{title}</h3>
      {tooltip && <Tooltip content={tooltip}><Info className="h-5 w-5 text-font-2 hover:text-font-1 cursor-help" /></Tooltip>}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle title="Decimal Separator" tooltip="Choose how decimal numbers are displayed and entered." />
        <div className="flex items-center gap-2">
          <span className="text-xs text-font-2 uppercase tracking-wider font-semibold">Preview</span>
          <Tooltip content="This preview shows how monetary values will be formatted.">
            <Info className="h-4 w-4 text-font-2 cursor-help" />
          </Tooltip>
        </div>
      </div>
      
      <div className="mb-6 p-4 rounded-xl border border-border flex items-center justify-center scale-90 origin-top">
        <div className="text-center">
          <div className="text-2xl font-bold text-font-1">
            <MoneyDisplay amount={1234.56} showSign={false} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <RadioCard
          selected={settings.formatting?.decimalSeparator !== 'comma'}
          onClick={() => handleDecimalSeparatorChange('dot')}
          title="Dot"
          description="International style"
          icon={<span className="text-2xl font-bold leading-none">.</span>}
        />
        <RadioCard
          selected={settings.formatting?.decimalSeparator === 'comma'}
          onClick={() => handleDecimalSeparatorChange('comma')}
          title="Comma"
          description="Continental style"
          icon={<span className="text-2xl font-bold leading-none">,</span>}
        />
      </div>
    </div>
  );
};

export default FormattingSettings;
