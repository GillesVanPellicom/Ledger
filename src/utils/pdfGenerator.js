import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const getImageAsBase64 = async (imagePath) => {
  if (window.electronAPI) {
    return await window.electronAPI.readFileAsBase64(imagePath);
  }
  return null;
};

export const generateReceiptsPdf = async (receipts, options = {}, onProgress) => {
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
    if (options.showUniqueItems) details.push(`Unique Items: ${receipt.lineItems.length}`);
    if (options.showTotalQuantity) details.push(`Total Quantity: ${receipt.lineItems.reduce((sum, item) => sum + item.LineQuantity, 0)}`);
    if (options.showPaymentMethod && receipt.PaymentMethodName) details.push(`Paid with: ${receipt.PaymentMethodName}`);

    if (details.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(details.join('  |  '), 14, yPos);
      yPos += 10;
    }

    // Line Items Table
    const tableColumn = ["Item", "Quantity", "Unit Price", "Total"];
    const tableRows = receipt.lineItems.map(item => [
      `${item.ProductName}\n${item.ProductBrand || ''}`,
      item.LineQuantity,
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

    let finalY = doc.lastAutoTable.finalY || yPos;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: € ${receipt.totalAmount.toFixed(2)}`, 14, finalY + 15);

    // Images
    if (options.addReceiptImages && receipt.images && receipt.images.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Receipt Images', 14, 22);
      let imageY = 30;
      for (const image of receipt.images) {
        try {
          const base64Image = await getImageAsBase64(image.src.replace('file://', ''));
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
    doc.text('Receipts Summary', 14, 22);

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
      footStyles: { fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 0 },
    });
  }

  doc.save(`receipts-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
