import React from 'react';
import Switch from '../../components/ui/Switch';
import { CreditCard, Users } from 'lucide-react';
import { Settings } from '../../types';

interface ModulesComponentProps {
  settings: Partial<Settings>;
  onToggle: (key: string) => void;
}

export const ModulesComponent: React.FC<ModulesComponentProps> = ({ settings, onToggle }) => {
  return (
    <div className="space-y-4">
      <Switch 
        label="Payment Methods" 
        description="Track spending across different payment methods." 
        isEnabled={settings.modules?.paymentMethods?.enabled ?? false} 
        onToggle={() => onToggle('paymentMethods')}
        icon={CreditCard}
      />
      <Switch 
        label="Debt Tracking" 
        description="Track debts and shared expenses." 
        isEnabled={settings.modules?.debt?.enabled ?? false} 
        onToggle={() => onToggle('debt')}
        icon={Users}
      />
    </div>
  );
};
