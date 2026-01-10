import React from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import Switch from './Switch';

interface VisibilityCardProps {
  isActive: boolean;
  onToggle: () => void;
  entityName?: string;
}

const VisibilityCard: React.FC<VisibilityCardProps> = ({ isActive, onToggle, entityName = 'item' }) => {
  return (
    <Switch
      label="Visibility"
      description={isActive ? `Shown in lists` : `Hidden from lists`}
      isEnabled={isActive}
      onToggle={onToggle}
      icon={isActive ? EyeIcon : EyeSlashIcon}
    />
  );
};

export default VisibilityCard;
