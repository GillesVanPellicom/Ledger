import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const generateReceiptsPdf = async (receipts, onProgress) => {
  const doc = new jsPDF();
  let isFirstPage = true;

  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i];
    
    if (!isFirstPage) {
      doc.addPage();
    }

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(0);
    doc.text(receipt.StoreName, 14, 22);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(format(new Date(receipt.ReceiptDate), 'EEEE, MMMM d, yyyy'), 14, 30);

    // Note
    if (receipt.ReceiptNote) {
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text("Note:", 14, 40);
      
      doc.setFont('helvetica', 'normal');
      doc.text(receipt.ReceiptNote, 25, 40);
    }

    // Line Items Table
    const tableColumn = ["Item", "Quantity", "Unit Price", "Total"];
    const tableRows = [];

    receipt.lineItems.forEach(item => {
      let itemText = item.ProductName;
      if (item.ProductSize && item.ProductUnitType) {
        itemText += ` - ${item.ProductSize}${item.ProductUnitType}`;
      }
      itemText += `\n${item.ProductBrand}`;

      const itemData = [
        itemText,
        item.LineQuantity,
        `€ ${item.LineUnitPrice.toFixed(2)}`,
        `€ ${(item.LineQuantity * item.LineUnitPrice).toFixed(2)}`
      ];
      tableRows.push(itemData);
    });

    autoTable(doc, {
      startY: 50,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { 
        fillColor: [22, 160, 133],
        halign: 'left'
      },
      styles: { cellPadding: 2, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          if (data.column.index === 2 || data.column.index === 3) {
            data.cell.styles.halign = 'right';
          }
        }
      }
    });

    // Total
    const finalY = doc.lastAutoTable.finalY || 50;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: € ${receipt.totalAmount.toFixed(2)}`, 14, finalY + 15);

    isFirstPage = false;

    if (onProgress) {
      const progress = Math.round(((i + 1) / receipts.length) * 100);
      onProgress(progress);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  doc.save(`receipts-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
