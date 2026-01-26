import React from 'react';
import { Info } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import RadioCard from '../ui/RadioCard';
import MoneyDisplay from '../ui/MoneyDisplay';
import { useSettingsStore } from '../../store/useSettingsStore';
import { cn } from '../../utils/cn';
import Combobox from '../ui/Combobox';

interface FormattingSettingsProps {
  showPreview?: boolean;
  showTitle?: boolean;
  showCard?: boolean;
}

const currencyOptions = [
  { value: '$', label: '$ (Dollar)' },
  { value: '€', label: '€ (Euro)' },
  { value: '£', label: '£ (Pound)' },
  { value: '¥', label: '¥ (Yen/Yuan)' },
  { value: '₩', label: '₩ (Won)' },
  { value: '₪', label: '₪ (Shekel)' },
  { value: '₫', label: '₫ (Dong)' },
  { value: '₭', label: '₭ (Kip)' },
  { value: '₹', label: '₹ (Rupee)' },
  { value: '₱', label: '₱ (Peso)' },
  { value: '₽', label: '₽ (Ruble)' },
  { value: '฿', label: '฿ (Baht)' },
  { value: '₺', label: '₺ (Lira)' },
  { value: '₦', label: '₦ (Naira)' },
  { value: 'R', label: 'R (Rand)' },
  { value: 'kr', label: 'kr (Krona/Krone)' },
  { value: '₲', label: '₲ (Guarani)' },
  { value: '₴', label: '₴ (Hryvnia)' },
  { value: '₸', label: '₸ (Tenge)' },
  { value: '₡', label: '₡ (Colon)' },
  { value: '₵', label: '₵ (Cedi)' },
  { value: '₼', label: '₼ (Manat)' },
  { value: '元', label: '元 (Yuan)' },
];

const FormattingSettings: React.FC<FormattingSettingsProps> = ({ showPreview = true, showTitle = true, showCard = true }) => {
  const { settings, updateSettings } = useSettingsStore();

  const handleDecimalSeparatorChange = (separator: 'dot' | 'comma') => {
    updateSettings({ formatting: { ...settings.formatting, decimalSeparator: separator } });
  };

  const handleCurrencyChange = (currency: string) => {
    updateSettings({ formatting: { ...settings.formatting, currency } });
  };

  const SectionTitle = ({ title, tooltip }: { title: string, tooltip?: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-lg font-medium text-font-1">{title}</h3>
      {tooltip && <Tooltip content={tooltip}><Info className="h-5 w-5 text-font-2 hover:text-font-1 cursor-help" /></Tooltip>}
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

  return (
    <div className={cn(!showCard && "contents", "space-y-8")}>
      {/* Decimal Separator Section */}
      <div>
        {(showTitle || showPreview) && (
          <div className="flex items-center justify-between">
            {showTitle && <SectionTitle title="Decimal Separator" tooltip="Choose how decimal numbers are displayed and entered." />}
            {showPreview && showTitle && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-font-2 uppercase tracking-wider font-semibold">Preview</span>
                <Tooltip content="This preview shows how monetary values will be formatted.">
                  <Info className="h-4 w-4 text-font-2 cursor-help" />
                </Tooltip>
              </div>
            )}
          </div>
        )}
        
        {showPreview && (
          <PreviewBox>
            <MoneyDisplay amount={1234.56} showSign={false} />
          </PreviewBox>
        )}
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

      {/* Currency Section */}
      <div>
        {showTitle && <SectionTitle title="Currency Symbol" tooltip="Choose the currency symbol used for monetary displays." />}
        <div className="w-full">
          <Combobox
            options={currencyOptions}
            value={settings.formatting?.currency || '€'}
            onChange={handleCurrencyChange}
            placeholder="Search currency..."
          />
        </div>
      </div>
    </div>
  );
};

export default FormattingSettings;
