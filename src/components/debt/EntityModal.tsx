import React, {useState, useEffect} from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import {db} from '../../utils/db';
import {Debtor} from '../../types';
import VisibilityCard from '../ui/VisibilityCard';

interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  entityToEdit: Debtor | null;
}

const EntityModal: React.FC<EntityModalProps> = ({isOpen, onClose, onSave, entityToEdit}) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (entityToEdit) {
        setName(entityToEdit.DebtorName);
        setIsActive(!!entityToEdit.DebtorIsActive);
      } else {
        setName('');
        setIsActive(true);
      }
      setError('');
    }
  }, [isOpen, entityToEdit]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (entityToEdit) {
        await db.execute(
          'UPDATE Entities SET EntityName = ?, EntityIsActive = ? WHERE EntityID = ?',
          [name.trim(), isActive ? 1 : 0, entityToEdit.DebtorID]
        );
      } else {
        await db.execute(
          'INSERT INTO Entities (EntityName, EntityIsActive) VALUES (?, ?)',
          [name.trim(), isActive ? 1 : 0]
        );
      }
      onSave();
      onClose();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setError('This name already exists.');
      } else {
        setError(err.message || 'Failed to save entity');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entityToEdit ? 'Edit Entity' : 'Add New Entity'}
      onEnter={handleSubmit}
      isDatabaseTransaction
      successToastMessage={entityToEdit ? 'Entity updated successfully' : 'Entity created successfully'}
      errorToastMessage="Failed to save entity"
      loadingMessage="Saving entity..."
      footer={<><Button variant="secondary"
                        onClick={onClose}
                        disabled={loading}>Cancel</Button><Button onClick={handleSubmit}
                                                                  loading={loading}>Save</Button></>}
    >
      <div className="space-y-4">
        {error &&
          <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{error}</div>}
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., John Doe"
        />
        <VisibilityCard 
          isActive={isActive}
          onToggle={() => setIsActive(!isActive)}
          entityName="entity"
        />
      </div>
    </Modal>
  );
};

export default EntityModal;
