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
  Link as LinkIcon
} from 'lucide-react';
import Tooltip from '../components/ui/Tooltip';
import {ConfirmModal} from '../components/ui/Modal';
import {Header} from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import {useErrorStore} from '../store/useErrorStore';
import MoneyDisplay from '../components/ui/MoneyDisplay';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const TransferViewPage: React.FC = () => {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {showError} = useErrorStore();
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

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
          </>
        }
      />
      <PageWrapper>
        <div className="py-6 flex justify-center">
          <div className="w-full max-w-4xl space-y-6">
            {transfer.Note && (
              <Card>
                <div className="p-4">
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
                      <div className="w-full">
                        <p className="text-xs font-semibold text-font-2 uppercase tracking-wider mb-2">Origin</p>
                        <div className="flex items-center justify-center gap-2">
                          <Link 
                            to={`/payment-methods/${transfer.FromPaymentMethodID}`} 
                            className="text-4xl font-bold text-font-1 hover:underline"
                          >
                            {transfer.FromMethodName}
                          </Link>
                          <LinkIcon className="h-5 w-5 text-font-2 shrink-0" />
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
                      <div className="w-full">
                        <p className="text-xs font-semibold text-font-2 uppercase tracking-wider mb-2">Destination</p>
                        <div className="flex items-center justify-center gap-2">
                          <Link 
                            to={`/payment-methods/${transfer.ToPaymentMethodID}`} 
                            className="text-4xl font-bold text-font-1 hover:underline"
                          >
                            {transfer.ToMethodName}
                          </Link>
                          <LinkIcon className="h-5 w-5 text-font-2 shrink-0" />
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
    </div>
  );
};

export default TransferViewPage;
