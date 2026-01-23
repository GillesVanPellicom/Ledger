import React, {useState} from 'react';
import {useParams, useNavigate, Link} from 'react-router-dom';
import {format, parseISO} from 'date-fns';
import {db} from '../utils/db';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  ArrowRight,
  Link as LinkIcon,
  FileText,
  Pencil
} from 'lucide-react';
import Tooltip from '../components/ui/Tooltip';
import Modal, {ConfirmModal} from '../components/ui/Modal';
import {Header} from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import {useErrorStore} from '../store/useErrorStore';
import MoneyDisplay from '../components/ui/MoneyDisplay';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import StepperInput from '../components/ui/StepperInput';
import Input from '../components/ui/Input';
import Combobox from '../components/ui/Combobox';
import Divider from '../components/ui/Divider';

const TransferViewPage: React.FC = () => {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {showError} = useErrorStore();
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [editData, setEditData] = useState({
    FromPaymentMethodID: '',
    ToPaymentMethodID: '',
    Amount: '0',
    Date: '',
    Note: ''
  });

  // Fetch transfer details
  const {data: transfer, isLoading} = useQuery({
    queryKey: ['transfer', id],
    queryFn: async () => {
      const data = await db.queryOne<any>(`
        SELECT t.*, 
               pm_from.PaymentMethodName as FromMethodName,
               pm_to.PaymentMethodName as ToMethodName
        FROM Transfers t
        JOIN PaymentMethods pm_from ON t.FromPaymentMethodID = pm_from.PaymentMethodID
        JOIN PaymentMethods pm_to ON t.ToPaymentMethodID = pm_to.PaymentMethodID
        WHERE t.TransferID = ?
      `, [id]);

      return data;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await db.execute(
        'UPDATE Transfers SET FromPaymentMethodID = ?, ToPaymentMethodID = ?, Amount = ?, TransferDate = ?, Note = ? WHERE TransferID = ?',
        [data.FromPaymentMethodID, data.ToPaymentMethodID, data.Amount, data.Date, data.Note, id]
      );
      
      // Also update the associated TopUps
      const topUps = await db.query<any>('SELECT TopUpID, PaymentMethodID FROM TopUps WHERE TransferID = ?', [id]);
      for (const tu of topUps) {
        // One TopUp is negative (from), one is positive (to)
        // We can distinguish them by checking which method they were originally associated with
        if (tu.PaymentMethodID === transfer.FromPaymentMethodID) {
          await db.execute(
            'UPDATE TopUps SET PaymentMethodID = ?, TopUpAmount = ?, TopUpDate = ?, TopUpNote = ? WHERE TopUpID = ?',
            [data.FromPaymentMethodID, -data.Amount, data.Date, data.Note, tu.TopUpID]
          );
        } else {
          await db.execute(
            'UPDATE TopUps SET PaymentMethodID = ?, TopUpAmount = ?, TopUpDate = ?, TopUpNote = ? WHERE TopUpID = ?',
            [data.ToPaymentMethodID, data.Amount, data.Date, data.Note, tu.TopUpID]
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer', id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsEditModalOpen(false);
    },
    onError: (err) => showError(err)
  });

  const handleDelete = async () => {
    if (!transfer) return;
    try {
      await db.execute('DELETE FROM Transfers WHERE TransferID = ?', [id]);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      navigate(-1);
    } catch (error) {
      showError(error as Error);
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const openEditModal = async () => {
    if (!transfer) return;

    const pmRows = await db.query("SELECT * FROM PaymentMethods");
    setPaymentMethods(pmRows.map((r: any) => ({ value: String(r.PaymentMethodID), label: r.PaymentMethodName })));

    setEditData({
      FromPaymentMethodID: String(transfer.FromPaymentMethodID),
      ToPaymentMethodID: String(transfer.ToPaymentMethodID),
      Amount: String(transfer.Amount),
      Date: transfer.TransferDate,
      Note: transfer.Note || ''
    });
    setIsEditModalOpen(true);
  };

  const handleStepperChange = (increment: boolean, step: number) => {
    setEditData((prev: any) => {
      const currentValue = Number.parseFloat(prev.Amount) || 0;
      const newValue = increment ? currentValue + step : currentValue - step;
      return {...prev, Amount: String(newValue)};
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner className="h-8 w-8 text-accent"/>
      </div>
    );
  }

  if (!transfer) {
    return <div className="text-center text-font-1">Transfer not found.</div>;
  }

  return (
    <div>
      <Header
        title="Transfer"
        subtitle={format(parseISO(transfer.TransferDate), 'EEEE, MMMM d, yyyy')}
        backButton={
          <Tooltip content="Go Back">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5"/>
            </Button>
          </Tooltip>
        }
        actions={
          <>
            <Tooltip content="Delete">
              <Button variant="ghost" size="icon" onClick={() => setDeleteModalOpen(true)}>
                <Trash2 className="h-5 w-5"/>
              </Button>
            </Tooltip>
            <Tooltip content="Edit">
              <Button variant="ghost" size="icon" onClick={openEditModal}>
                <Pencil className="h-5 w-5"/>
              </Button>
            </Tooltip>
          </>
        }
      />
      <PageWrapper>
        <div className="py-6 flex justify-center">
          <div className="w-full max-w-4xl space-y-6">
            {transfer.Note && (
              <Card>
                <div className="p-4 flex items-start gap-3">
                  <Tooltip content="Note about the contents of this page">
                    <FileText className="h-5 w-5 text-font-2 shrink-0 mt-0.5" />
                  </Tooltip>
                  <p className="text-base text-font-1 whitespace-pre-wrap break-words">{transfer.Note}</p>
                </div>
              </Card>
            )}

            <Card>
              <div className="p-8">
                <div className="flex flex-col items-center gap-12">
                  
                  {/* Transfer Flow Visualization */}
                  <div className="flex items-center justify-between w-full gap-4">
                    {/* Origin */}
                    <div className="flex-1 flex flex-col items-center text-center space-y-4">
                      <div className="w-full flex flex-col items-center">
                        <p className="text-xs font-semibold text-font-2 uppercase tracking-wider mb-2">Origin</p>
                        <div className="relative inline-flex items-center group">
                          <Link 
                            to={`/payment-methods/${transfer.FromPaymentMethodID}`} 
                            className="text-4xl font-bold text-font-1 hover:underline"
                          >
                            {transfer.FromMethodName}
                          </Link>
                          <LinkIcon className="h-5 w-5 text-font-2 shrink-0 absolute -right-7 group-hover:text-accent" />
                        </div>
                      </div>
                      <MoneyDisplay 
                        amount={-transfer.Amount} 
                        className="text-2xl font-bold" 
                        colorNegative={true}
                        useSignum={true}
                      />
                    </div>

                    {/* Arrow */}
                    <div className="flex flex-col items-center">
                      <div className="p-4 rounded-full bg-bg-2 text-font-2">
                        <ArrowRight className="h-12 w-12" />
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="flex-1 flex flex-col items-center text-center space-y-4">
                      <div className="w-full flex flex-col items-center">
                        <p className="text-xs font-semibold text-font-2 uppercase tracking-wider mb-2">Destination</p>
                        <div className="relative inline-flex items-center group">
                          <Link 
                            to={`/payment-methods/${transfer.ToPaymentMethodID}`} 
                            className="text-4xl font-bold text-font-1 hover:underline"
                          >
                            {transfer.ToMethodName}
                          </Link>
                          <LinkIcon className="h-5 w-5 text-font-2 shrink-0 absolute -right-7 group-hover:text-accent" />
                        </div>
                      </div>
                      <MoneyDisplay 
                        amount={transfer.Amount} 
                        className="text-2xl font-bold" 
                        colorPositive={true}
                        useSignum={true}
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="w-full pt-8 border-t border-border">
                    <Tooltip content="The date this transfer was recorded">
                      <div className="flex items-center gap-3 cursor-help w-fit">
                        <Calendar className="h-5 w-5 text-font-2" />
                        <span className="text-sm text-font-1">{format(parseISO(transfer.TransferDate), 'MMMM d, yyyy')}</span>
                      </div>
                    </Tooltip>
                  </div>

                </div>
              </div>
            </Card>
          </div>
        </div>
      </PageWrapper>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Transfer"
        message="Are you sure you want to permanently delete this transfer? This action cannot be undone."
      />

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Transfer"
        onEnter={() => updateMutation.mutate(editData)}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate(editData)}
              loading={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Combobox
              label="From Method"
              options={paymentMethods}
              value={editData.FromPaymentMethodID}
              onChange={val => setEditData(prev => ({...prev, FromPaymentMethodID: val}))}
            />
            <Combobox
              label="To Method"
              options={paymentMethods}
              value={editData.ToPaymentMethodID}
              onChange={val => setEditData(prev => ({...prev, ToPaymentMethodID: val}))}
            />
          </div>
          <Divider className="my-2"/>
          <StepperInput
            label="Amount"
            step={1}
            min={0}
            value={editData.Amount}
            onChange={e => setEditData(prev => ({...prev, Amount: e.target.value}))}
            onIncrement={() => handleStepperChange(true, 1)}
            onDecrement={() => handleStepperChange(false, 1)}
          />
          <Divider className="my-2"/>
          <Input
            label="Date"
            type="date"
            value={editData.Date}
            onChange={e => setEditData(prev => ({...prev, Date: e.target.value}))}
          />
          <Input
            type="text"
            label="Note"
            value={editData.Note}
            onChange={e => setEditData(prev => ({...prev, Note: e.target.value}))}
          />
        </div>
      </Modal>
    </div>
  );
};

export default TransferViewPage;
