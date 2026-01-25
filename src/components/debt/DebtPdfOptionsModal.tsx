import React, {useState} from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';

interface DebtPdfOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (direction: 'all' | 'to_me' | 'to_entity', status: 'all' | 'settled' | 'unsettled') => void;
}

const DebtPdfOptionsModal: React.FC<DebtPdfOptionsModalProps> = ({isOpen, onClose, onConfirm}) => {
  const [direction, setDirection] = useState<'all' | 'to_me' | 'to_entity'>('all');
  const [status, setStatus] = useState<'all' | 'settled' | 'unsettled'>('all');

  const handleConfirm = () => {
    onConfirm(direction, status);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Debt Report PDF"
      onEnter={handleConfirm}
      isDatabaseTransaction={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Generate PDF</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Include Expenses"
          value={direction}
          onChange={(e) => setDirection(e.target.value as 'all' | 'to_me' | 'to_entity')}
          options={[
            {value: 'all', label: 'All Expenses'},
            {value: 'to_me', label: 'Expenses where they owe you'},
            {value: 'to_entity', label: 'Expenses where you owe them'},
          ]}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'all' | 'settled' | 'unsettled')}
          options={[
            {value: 'all', label: 'Settled and Unsettled'},
            {value: 'settled', label: 'Settled'},
            {value: 'unsettled', label: 'Unsettled'},
          ]}
        />
      </div>
    </Modal>
  );
};

export default DebtPdfOptionsModal;
