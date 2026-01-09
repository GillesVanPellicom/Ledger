import { useState } from 'react';
import { generateReceiptsPdf } from '../utils/pdfGenerator';
import { useError } from '../context/ErrorContext';
import { Receipt, LineItem, ReceiptImage } from '../types';

interface FullReceipt extends Receipt {
  lineItems: LineItem[];
  images: ReceiptImage[];
  totalAmount: number;
  debtInfo?: {
    direction: string;
  };
}

interface UsePdfGeneratorResult {
  generatePdf: (receipts: FullReceipt[], options?: any) => Promise<void>;
  isGenerating: boolean;
  progress: number;
}

export const usePdfGenerator = (): UsePdfGeneratorResult => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const { showError } = useError();

  const generatePdf = async (receipts: FullReceipt[], options: any = {}) => {
    setIsGenerating(true);
    setProgress(0);
    try {
      await generateReceiptsPdf(receipts, options, (p) => setProgress(p));
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsGenerating(false);
    }
  };

  return { generatePdf, isGenerating, progress };
};
