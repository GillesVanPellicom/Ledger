import React, {useState, useEffect, useMemo} from 'react';
import Modal, {ConfirmModal} from '../ui/Modal';
import Button from '../ui/Button';
import {db} from '../../utils/db';
import {X, Lock} from 'lucide-react';
import {nanoid} from 'nanoid';
import ProgressModal from '../ui/ProgressModal';
import {ReceiptSplit} from '../../types';
import Card from "../ui/Card";
import Combobox from "../ui/Combobox";
import StepperInput from "../ui/StepperInput";
import {useSettingsStore} from '../../store/useSettingsStore';
import Tooltip from '../ui/Tooltip';
import {calculateTotalShares} from '../../logic/debt/debtLogic';
import { useEntities } from '../../hooks/useReferenceData';

interface BulkDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptIds: number[];
  onComplete: () => void;
}

const BulkDebtModal: React.FC<BulkDebtModalProps> = ({isOpen, onClose, receiptIds, onComplete}) => {
  const {settings} = useSettingsStore();
  const [receiptSplits, setReceiptSplits] = useState<ReceiptSplit[]>([]);
  const [ownShares, setOwnShares] = useState(0);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [conflictingReceipts, setConflictingReceipts] = useState<number[]>([]);

  const { data: entitiesData } = useEntities({ page: 1, pageSize: 1000 });
  const activeDebtors = useMemo(() => (entitiesData?.entities || []).filter((e: any) => e.EntityIsActive), [entitiesData]);

  useEffect(() => {
    if (isOpen) {
      setReceiptSplits([]);
      setOwnShares(0);
    }
  }, [isOpen]);

  const totalShares = useMemo(() => {
    return calculateTotalShares(ownShares, receiptSplits);
  }, [receiptSplits, ownShares]);

  const handleAddSplit = (debtorId: string) => {
    if (!debtorId) return;
    const debtor = activeDebtors.find((d: any) => d.EntityID === parseInt(debtorId));
    if (debtor) {
      setReceiptSplits(prev => [...prev, {
        key: nanoid(),
        DebtorID: debtor.EntityID,
        DebtorName: debtor.EntityName,
        SplitPart: 1
      }]);
    }
  };

  const handleUpdateSplitPart = (key: string, newPart: string) => {
    setReceiptSplits(prev => prev.map(s => s.key === key ? {...s, SplitPart: parseInt(newPart) || 1} : s));
  };

  const handleRemoveSplit = (key: string) => {
    setReceiptSplits(prev => prev.filter(s => s.key !== key));
  };

  const startBulkUpdate = async () => {
    const receiptsWithDebt = await db.query<{ ReceiptID: number }>(`
        SELECT DISTINCT ExpenseID as ReceiptID
        FROM (SELECT ExpenseID
              FROM ExpenseLineItems
              WHERE ExpenseID IN (${receiptIds.join(',')})
                AND EntityID IS NOT NULL
              UNION
              SELECT ExpenseID
              FROM ExpenseSplits
              WHERE ExpenseID IN (${receiptIds.join(',')}))
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

    try {
      for (const receiptId of targetReceiptIds) {
        await db.execute(
          'UPDATE Expenses SET SplitType = ?, OwnShares = ?, TotalShares = ? WHERE ExpenseID = ?',
          ['total_split', ownShares, totalShares, receiptId]
        );
        updateProgress();

        await db.execute('DELETE FROM ExpenseSplits WHERE ExpenseID = ?', [receiptId]);
        updateProgress();

        for (const split of receiptSplits) {
          await db.execute('INSERT INTO ExpenseSplits (ExpenseID, EntityID, SplitPart) VALUES (?, ?, ?)', [receiptId, split.DebtorID, split.SplitPart]);
          updateProgress();
        }
      }
      onComplete();
      onClose();
    } catch (error) {
      console.error("Bulk update failed:", error);
      throw error; 
    } finally {
      setIsProcessing(false);
    }
  };

  const debtorOptions = useMemo(() => 
    activeDebtors
      .filter((d: any) => !receiptSplits.some(s => s.DebtorID === d.EntityID))
      .map((d: any) => ({
        value: String(d.EntityID),
        label: d.EntityName
      })),
    [activeDebtors, receiptSplits]
  );

  return (
    <>
      <Modal
        isOpen={isOpen && !isProcessing}
        onClose={onClose}
        title={`Bulk Assign Debt (${receiptIds.length} items effected)`}
        onEnter={startBulkUpdate}
        isDatabaseTransaction
        successToastMessage="Bulk debt assignment complete"
        errorToastMessage="Failed to assign debt"
        loadingMessage="Analyzing selection..."
        footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={startBulkUpdate}
                                                                                       disabled={totalShares === 0}>Apply</Button></>}
      >
        <div className="space-y-4">
          <p className="text-sm text-font-2">This will apply a 'Split Total' debt configuration to
                                                                  all selected expenses. Any existing debt assignments
                                                                  on these expenses will be affected.</p>
          <div className="space-y-2">
            <Card className="flex items-center justify-between p-3">
              <span className="font-medium text-font-1">{settings.userName || 'User'} (Me)</span>
              <div className="flex items-center gap-3">
                <StepperInput
                  value={String(ownShares)}
                  onChange={(e) => setOwnShares(parseInt(e.target.value) || 0)}
                  onIncrement={() => setOwnShares(prev => prev + 1)}
                  onDecrement={() => setOwnShares(prev => Math.max(0, prev - 1))}
                  min={0}
                  className="w-32"
                />
                <div className="w-8 h-8 flex items-center justify-center">
                  <Tooltip content="You cannot remove yourself.">
                    <Lock className="h-4 w-4 text-font-2"/>
                  </Tooltip>
                </div>
              </div>
            </Card>

            {receiptSplits.map(split => (
              <Card key={split.key} className="flex items-center justify-between p-3">
                <span className="font-medium text-font-1">{split.DebtorName}</span>
                <div className="flex items-center gap-3">
                  <StepperInput
                    value={String(split.SplitPart)}
                    onChange={(e) => handleUpdateSplitPart(split.key, e.target.value)}
                    onIncrement={() => handleUpdateSplitPart(split.key, String(Number(split.SplitPart) + 1))}
                    onDecrement={() => handleUpdateSplitPart(split.key, String(Math.max(1, Number(split.SplitPart) - 1)))}
                    min={1}
                    className="w-32"
                  />
                  <Button variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSplit(split.key)}
                          className="text-red hover:text-red/80">
                    <X className="h-4 w-4"/>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <Combobox
              options={debtorOptions}
              value=""
              onChange={handleAddSplit}
              placeholder="Add Debtor..."
              searchPlaceholder="Search for a debtor..."
              noResultsText="No debtors found."
            />
            <div className="text-sm text-font-2 text-right">Total Shares: {totalShares}</div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        title="Debt Assignment Conflict"
        message={`${conflictingReceipts.length} of the selected expenses already have debt assignments. How would you like to proceed?`}
        confirmText="Overwrite All"
        onConfirm={async () => {
          setIsConflictModalOpen(false);
          await processBulkUpdate([]);
        }}
        secondaryText="Skip Conflicting"
        onSecondaryAction={async () => {
          setIsConflictModalOpen(false);
          await processBulkUpdate(conflictingReceipts);
        }}
        isDatabaseTransaction
        successToastMessage="Bulk debt assignment complete"
        errorToastMessage="Failed to assign debt"
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
