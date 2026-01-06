import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';

const DebtPdfOptionsModal = ({ isOpen, onClose, onConfirm }) => {
  const [direction, setDirection] = useState('all');
  const [status, setStatus] = useState('all');

  const handleConfirm = () => {
    onConfirm(direction, status);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Debt Report PDF"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Generate PDF</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Include Receipts"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          options={[
            { value: 'all', label: 'All Receipts' },
            { value: 'to_me', label: 'Receipts where they owe you' },
            { value: 'to_entity', label: 'Receipts where you owe them' },
          ]}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'all', label: 'Settled and Unsettled' },
            { value: 'settled', label: 'Settled' },
            { value: 'unsettled', label: 'Unsettled' },
          ]}
        />
      </div>
    </Modal>
  );
};

export default DebtPdfOptionsModal;
