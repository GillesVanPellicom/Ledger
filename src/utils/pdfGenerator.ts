import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Receipt, LineItem, ReceiptImage } from '../types';
import '../electron.d';
import { calculateDiscount } from './discountCalculator';

interface PdfOptions {
  showUniqueItems?: boolean;
  showTotalQuantity?: boolean;
  showPaymentMethod?: boolean;
  addReceiptImages?: boolean;
  addSummaryPage?: boolean;
}

interface FullReceipt extends Receipt {
  lineItems: LineItem[];
  images: ReceiptImage[];
  totalAmount: number;
  debtInfo?: {
    direction: string;
  };
}

const getImageAsBase64 = async (imagePath: string): Promise<string | null> => {
  if (window.electronAPI && imagePath) {
    return await window.electronAPI.readFileAsBase64(imagePath.replace('file://', ''));
  }
  return null;
};

export const generateReceiptsPdf = async (receipts: FullReceipt[], options: PdfOptions = {}, onProgress?: (progress: number) => void) => {
  const doc = new jsPDF();
  let grandTotal = 0;

  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i];
    grandTotal += receipt.totalAmount;

    if (i > 0) doc.addPage();

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(receipt.StoreName, 14, 22);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(format(new Date(receipt.ReceiptDate), 'EEEE, MMMM d, yyyy'), 14, 30);

    let yPos = 40;

    // Debt Info
    if (receipt.debtInfo) {
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text(receipt.debtInfo.direction, 14, yPos);
      yPos += 10;
    }

    // Optional Details
    if (receipt.ReceiptNote) {
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text("Note:", 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(receipt.ReceiptNote, 25, yPos);
      yPos += 10;
    }

    const details = [];
    if (options.showUniqueItems && !receipt.IsNonItemised) details.push(`Unique Items: ${receipt.lineItems.length}`);
    if (options.showTotalQuantity && !receipt.IsNonItemised) details.push(`Total Quantity: ${receipt.lineItems.reduce((sum, item) => sum + item.LineQuantity, 0)}`);
    if (options.showPaymentMethod && receipt.PaymentMethodName) details.push(`Paid with: ${receipt.PaymentMethodName}`);

    if (details.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(details.join('  |  '), 14, yPos);
      yPos += 10;
    }

    let finalY = yPos;

    if (!receipt.IsNonItemised) {
      // Line Items Table
      const tableColumn = ["Item", "Quantity", "Unit Price", "Total"];
      const tableRows = receipt.lineItems.map(item => [
        `${item.ProductName}\n${item.ProductBrand || ''}`,
        item.LineQuantity.toString(),
        `€ ${item.LineUnitPrice.toFixed(2)}`,
        `€ ${(item.LineQuantity * item.LineUnitPrice).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133], halign: 'left' },
        styles: { cellPadding: 2, fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
        },
      });

      finalY = (doc as any).lastAutoTable.finalY || yPos;
      
      if (receipt.Discount > 0) {
        const subtotal = receipt.lineItems.reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
        const discountAmount = calculateDiscount(receipt.lineItems, receipt.Discount);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');
        doc.text(`Subtotal: € ${subtotal.toFixed(2)}`, 14, finalY + 10);
        doc.text(`Discount (${receipt.Discount}%): -€ ${discountAmount.toFixed(2)}`, 14, finalY + 15);
        finalY += 10;
      }
    }

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: € ${receipt.totalAmount.toFixed(2)}`, 14, finalY + 15);

    // Images
    if (options.addReceiptImages && receipt.images && receipt.images.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Expense Images', 14, 22);
      let imageY = 30;
      for (const image of receipt.images) {
        try {
          if (image.src) {
            const base64Image = await getImageAsBase64(image.src);
            if (base64Image) {
              const img = new Image();
              img.src = `data:image/jpeg;base64,${base64Image}`;
              await new Promise(resolve => img.onload = resolve);
              
              const imgWidth = 180;
              const imgHeight = (img.height * imgWidth) / img.width;
              
              if (imageY + imgHeight > 280) {
                doc.addPage();
                imageY = 22;
              }
              
              doc.addImage(img.src, 'JPEG', 15, imageY, imgWidth, imgHeight);
              imageY += imgHeight + 10;
            }
          }
        } catch (error) {
          console.error("Failed to add image to PDF:", error);
        }
      }
    }

    if (onProgress) {
      const progress = Math.round(((i + 1) / receipts.length) * 100);
      onProgress(progress);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // Summary Page
  if (receipts.length > 1 && options.addSummaryPage) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('Expenses Summary', 14, 22);

    const summaryColumns = ["Store", "Date", "Note", "Total"];
    const summaryRows = receipts.map(r => [
      r.StoreName,
      format(new Date(r.ReceiptDate), 'dd/MM/yyyy'),
      r.ReceiptNote || '-',
      `€ ${r.totalAmount.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 30,
      head: [summaryColumns],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] },
      foot: [['', '', 'Grand Total', `€ ${grandTotal.toFixed(2)}`]],
      footStyles: { fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 0, halign: 'right' },
    });
  }

  doc.save(`expenses-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
