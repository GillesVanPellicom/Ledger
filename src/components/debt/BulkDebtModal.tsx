import React, { useState, useEffect, useMemo } from 'react';
import Modal, { ConfirmModal } from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import { db } from '../../utils/db';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { nanoid } from 'nanoid';
import ProgressModal from '../ui/ProgressModal';
import { Debtor, ReceiptSplit } from '../../types';

interface BulkDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptIds: number[];
  onComplete: () => void;
}

const BulkDebtModal: React.FC<BulkDebtModalProps> = ({ isOpen, onClose, receiptIds, onComplete }) => {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [receiptSplits, setReceiptSplits] = useState<ReceiptSplit[]>([]);
  const [ownShares, setOwnShares] = useState(0);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [conflictingReceipts, setConflictingReceipts] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchDebtors = async () => {
        const debtorsData = await db.query<Debtor[]>('SELECT DebtorID, DebtorName FROM Debtors WHERE DebtorIsActive = 1 ORDER BY DebtorName');
        setDebtors(debtorsData);
      };
      fetchDebtors();
      setReceiptSplits([]);
      setOwnShares(0);
    }
  }, [isOpen]);

  const totalShares = useMemo(() => {
    const debtorShares = receiptSplits.reduce((acc, curr) => acc + Number(curr.SplitPart || 0), 0);
    return debtorShares + ownShares;
  }, [receiptSplits, ownShares]);

  const handleAddSplit = (debtorId: string) => {
    if (!debtorId) return;
    const debtor = debtors.find(d => d.DebtorID === parseInt(debtorId));
    if (debtor) {
      setReceiptSplits(prev => [...prev, { key: nanoid(), DebtorID: debtor.DebtorID, DebtorName: debtor.DebtorName, SplitPart: 1 }]);
    }
  };

  const handleUpdateSplitPart = (key: string, newPart: string) => {
    setReceiptSplits(prev => prev.map(s => s.key === key ? { ...s, SplitPart: parseInt(newPart) || 1 } : s));
  };

  const handleRemoveSplit = (key: string) => {
    setReceiptSplits(prev => prev.filter(s => s.key !== key));
  };

  const startBulkUpdate = async () => {
    const receiptsWithDebt = await db.query<{ ReceiptID: number }[]>(`
      SELECT DISTINCT ReceiptID FROM (
        SELECT ReceiptID FROM LineItems WHERE ReceiptID IN (${receiptIds.join(',')}) AND DebtorID IS NOT NULL
        UNION
        SELECT ReceiptID FROM ReceiptSplits WHERE ReceiptID IN (${receiptIds.join(',')})
      )
    `);
    const conflicting = receiptsWithDebt.map(r => r.ReceiptID);
    
    if (conflicting.length > 0) {
      setConflictingReceipts(conflicting);
      setIsConflictModalOpen(true);
    } else {
      await processBulkUpdate([]);
    }
  };

  const processBulkUpdate = async (ignoreIds: number[]) => {
    setIsProcessing(true);
    setProgress(0);
    
    const targetReceiptIds = receiptIds.filter(id => !ignoreIds.includes(id));
    if (targetReceiptIds.length === 0) {
      setIsProcessing(false);
      onClose();
      return;
    }

    const totalSteps = targetReceiptIds.length * (2 + receiptSplits.length);
    let completedSteps = 0;

    const updateProgress = () => {
      completedSteps++;
      setProgress((completedSteps / totalSteps) * 100);
    };

    for (const receiptId of targetReceiptIds) {
      await db.execute(
        'UPDATE Receipts SET SplitType = ?, OwnShares = ?, TotalShares = ? WHERE ReceiptID = ?', 
        ['total_split', ownShares, totalShares, receiptId]
      );
      updateProgress();

      await db.execute('DELETE FROM ReceiptSplits WHERE ReceiptID = ?', [receiptId]);
      updateProgress();

      for (const split of receiptSplits) {
        await db.execute('INSERT INTO ReceiptSplits (ReceiptID, DebtorID, SplitPart) VALUES (?, ?, ?)', [receiptId, split.DebtorID, split.SplitPart]);
        updateProgress();
      }
    }

    setIsProcessing(false);
    onComplete();
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !isProcessing}
        onClose={onClose}
        title={`Bulk Assign Debt to ${receiptIds.length} Receipts`}
        footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={startBulkUpdate} disabled={totalShares === 0}>Apply Debt</Button></>}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">This will apply a 'Split Total' debt configuration to all selected receipts. Any existing debt assignments on these receipts will be affected.</p>
          <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
            <div className="grid grid-cols-2 gap-4 items-end">
              <Select 
                label="Add Debtor"
                value=""
                onChange={(e) => { if (e.target.value) { handleAddSplit(e.target.value); } }}
                options={[{ value: '', label: 'Add Debtor...' }, ...debtors.filter(d => !receiptSplits.some(s => s.DebtorID === d.DebtorID)).map(d => ({ value: d.DebtorID, label: d.DebtorName }))]}
                className="bg-white dark:bg-gray-800"
              />
              <Input 
                label="Own Shares"
                type="number"
                name="ownShares"
                value={ownShares.toString()}
                onChange={(e) => setOwnShares(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div className="space-y-2">
              {receiptSplits.map(split => (
                <div key={split.key} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <span className="font-medium">{split.DebtorName}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Shares:</span>
                      <input type="number" min="1" value={split.SplitPart} onChange={(e) => handleUpdateSplitPart(split.key, e.target.value)} className="w-16 rounded-md border-gray-300 dark:border-gray-700 text-sm" />
                    </div>
                    <button onClick={() => handleRemoveSplit(split.key)} className="text-red-500 hover:text-red-700"><XMarkIcon className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              {totalShares > 0 && <div className="text-sm text-gray-500 text-right mt-2">Total Shares: {totalShares}</div>}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        title="Debt Assignment Conflict"
        message={`${conflictingReceipts.length} of the selected receipts already have debt assignments. How would you like to proceed?`}
        confirmText="Overwrite All"
        onConfirm={() => { setIsConflictModalOpen(false); processBulkUpdate([]); }}
        secondaryText="Skip Conflicting"
        onSecondaryAction={() => { setIsConflictModalOpen(false); processBulkUpdate(conflictingReceipts); }}
      />

      <ProgressModal
        isOpen={isProcessing}
        progress={progress}
        title="Applying Debt..."
      />
    </>
  );
};

export default BulkDebtModal;
