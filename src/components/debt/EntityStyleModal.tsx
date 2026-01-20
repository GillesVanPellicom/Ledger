import React from 'react';
import AppearanceModal from '../ui/AppearanceModal';
import { Debtor, DebtorStyle } from '../../types';

interface EntityStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entityId: number, style: DebtorStyle) => void;
  entity: Debtor;
  currentStyle?: DebtorStyle;
}

const EntityStyleModal: React.FC<EntityStyleModalProps> = ({ isOpen, onClose, onSave, entity, currentStyle }) => {
  return (
    <AppearanceModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={(style) => onSave(entity.DebtorID, style)}
      title={`Style: ${entity?.DebtorName}`}
      initialSymbol={currentStyle?.symbol}
      initialType={currentStyle?.type}
      defaultIcon="User"
    />
  );
};

export default EntityStyleModal;
