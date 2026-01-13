import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import jsPDF from "jspdf";
import { useAppSettings } from "@/hooks/usePerformanceMode";

interface VeeEssPharmaPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function VeeEssPharmaPO({ poNumber, poDate, items, stockItems, onClose }: VeeEssPharmaPOProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { doctorName } = useAppSettings();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' }).replace(/\//g, '-');
  };

  const formatDateSlash = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const getStockItemDetails = (stockItemId: number) => {
    return stockItems.find(item => item.id === stockItemId);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printHTML = printContent.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${poNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { 
              size: A4; 
              margin: 12mm 15mm;
            }
            html, body { 
              height: 100%; 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt; 
              line-height: 1.5;
            }
            body { 
              padding: 0;
              display: flex;
              flex-direction: column;
              min-height: 100vh;
            }
            .content-wrapper {
              flex: 1;
              display: flex;
              flex-direction: column;
            }
            .header-row { text-align: center; font-size: 13pt; margin-bottom: 8px; }
            .hospital-name { font-size: 26pt; font-weight: bold; text-align: center; margin-bottom: 10px; }
            .address-row { text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 6px; }
            .licence-row { text-align: center; font-size: 12pt; font-weight: bold; margin-bottom: 14px; }
            .po-date-row { display: flex; justify-content: space-between; font-size: 14pt; font-weight: bold; margin-bottom: 14px; padding: 0 20px; }
            .to-section { margin-bottom: 12px; font-size: 13pt; line-height: 1.6; margin-left: 25px; }
            table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13pt; }
            th, td { border: 1px solid #000; padding: 10px 12px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            .flex-spacer { flex: 1; min-height: 30px; }
            .footer-section { font-size: 13pt; margin-top: auto; margin-left: 25px; line-height: 1.7; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="content-wrapper">
            ${printHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const leftMargin = 15;
    const rightMargin = 15;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    let y = 18;

    // Header row - centered and bold
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.text('Regd. Govt of Punjab', pageWidth / 2, y, { align: 'center' });
    y += 7;
    pdf.text('Mob: 6284942412', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Hospital Name (centered) - bold
    pdf.setFontSize(26);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Address - bold
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.text(`Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib    ${doctorName}`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Licence - bold
    pdf.setFontSize(13);
    pdf.setFont('times', 'bold');
    pdf.text('Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 14;

    // PO Number and Date - bold
    pdf.setFontSize(15);
    pdf.setFont('times', 'bold');
    pdf.text(`PO NO: ${poNumber}`, leftMargin + 10, y);
    pdf.text(`DATE: ${formatDate(poDate)}`, pageWidth - rightMargin - 10, y, { align: 'right' });
    y += 14;

    // To Section
    pdf.setFontSize(14);
    pdf.setFont('times', 'normal');
    const toMargin = leftMargin + 15;
    pdf.text('To', toMargin, y);
    y += 7;
    pdf.setFont('times', 'bold');
    pdf.text('VEE ESS PHARMACEUTICALS', toMargin, y);
    y += 7;
    pdf.setFont('times', 'normal');
    pdf.text('PATRAN ROAD DRB,SANGRUR', toMargin, y);
    y += 7;
    pdf.text('PUNJAB-148035', toMargin, y);
    y += 10;

    pdf.text('Subject:Medicine order', toMargin, y);
    y += 8;
    pdf.text("Dear Sir,Ma'am", toMargin, y);
    y += 8;
    pdf.text('Kindly provide us :-', toMargin, y);
    y += 12;

    // Table - Calculate dynamic row height
    const tableHeaders = ['Sr. No.', 'Product name', 'Pack', 'Qty.'];
    const colWidths = [22, 95, 35, 28];
    let x = leftMargin;

    // Calculate available space for table
    const tableStartY = y;
    const reservedBottomSpace = 80;
    const availableTableHeight = pageHeight - tableStartY - reservedBottomSpace;
    const minRowHeight = 10;
    const headerHeight = 12;
    // Add minimum 4 rows for table consistency
    const totalRows = Math.max(items.length, 4);
    const rowHeight = Math.max(minRowHeight, Math.min(14, (availableTableHeight - headerHeight) / totalRows));

    // Table header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(x, y, contentWidth, headerHeight, 'F');
    pdf.setFontSize(13);
    pdf.setFont('times', 'bold');
    tableHeaders.forEach((header, i) => {
      const cellX = x + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      pdf.rect(cellX, y, colWidths[i], headerHeight);
      pdf.text(header, cellX + colWidths[i] / 2, y + 8, { align: 'center' });
    });
    y += headerHeight;

    // Table rows
    pdf.setFontSize(13);
    pdf.setFont('times', 'normal');
    items.forEach((item, index) => {
      const stockItem = getStockItemDetails(item.stockItemId);
      const packing = stockItem?.packing || "10*10";

      const rowData = [
        `${index + 1}.`,
        item.stockItemName,
        packing,
        `${item.quantity}TAB`
      ];

      let cellX = x;
      rowData.forEach((cell, i) => {
        pdf.rect(cellX, y, colWidths[i], rowHeight);
        const align = i === 0 || i >= 2 ? 'center' : 'left';
        const textX = align === 'center' ? cellX + colWidths[i] / 2 : cellX + 4;
        pdf.text(cell, textX, y + rowHeight / 2 + 2, { align });
        cellX += colWidths[i];
      });
      y += rowHeight;
    });

    // Empty rows to fill table space
    const emptyRows = Math.max(0, 4 - items.length);
    for (let i = 0; i < emptyRows; i++) {
      let cellX = x;
      colWidths.forEach((width) => {
        pdf.rect(cellX, y, width, rowHeight);
        cellX += width;
      });
      y += rowHeight;
    }

    // Position footer at bottom
    y = pageHeight - reservedBottomSpace + 10;

    // Footer Section
    pdf.setFontSize(13);
    pdf.text('For our centre Navjeevan hospital at below written address at the earliest.', toMargin, y);
    y += 8;
    pdf.text('Address: Navjeevan hospital Opp.Busstand,Vill.Bara,Sirhind,distt. Fatehgarh sahib.', toMargin, y);
    y += 10;
    pdf.text('Thanking you', toMargin, y);
    y += 7;
    pdf.text('Yours Sincerely,', toMargin, y);
    y += 10;
    pdf.text('Navjeevanhospital,Sirhind', toMargin, y);
    y += 7;
    pdf.text(`Date: ${formatDateSlash(poDate)}`, toMargin, y);
    y += 8;
    pdf.text('OPP.NEW BUS STAND,', toMargin, y);
    y += 7;
    pdf.text('G.T.ROAD, BARA ,SIRHIND', toMargin, y);

    pdf.save(`PO-${poNumber}-VEE-ESS-Pharma.pdf`);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>VEE ESS Pharmaceuticals Purchase Order Format</span>
            <div className="flex gap-2">
              <Button onClick={handleDownloadPDF} size="sm" variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button onClick={handlePrint} size="sm" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-8 bg-white text-black min-h-[842px] flex flex-col" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '13pt', lineHeight: '1.6' }}>
          {/* Header Row - Centered */}
          <div className="text-center text-[14pt] font-bold mb-3">
            <p>Regd. Govt of Punjab</p>
            <p>Mob: 6284942412</p>
          </div>

          {/* Hospital Header */}
          <div className="my-4">
            <h1 className="text-[26pt] font-bold text-center">NAVJEEVAN HOSPITAL</h1>
          </div>

          {/* Address Row */}
          <p className="text-center text-[14pt] font-bold mb-3">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;{doctorName}
          </p>

          {/* Licence Row */}
          <p className="text-center text-[13pt] font-bold mb-6">
            Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024
          </p>

          {/* PO NO and Date */}
          <div className="flex justify-between text-[15pt] font-bold mb-6 px-6">
            <span>PO NO: {poNumber}</span>
            <span>DATE: {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[13pt] mb-5 leading-relaxed ml-10">
            <p className="mb-2">To</p>
            <p className="font-bold">VEE ESS PHARMACEUTICALS</p>
            <p>PATRAN ROAD DRB,SANGRUR</p>
            <p>PUNJAB-148035</p>
            <p className="mt-4">Subject:Medicine order</p>
            <p className="mt-4">Dear Sir,Ma&apos;am</p>
            <p className="mt-4">Kindly provide us :-</p>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-5 text-[13pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-4 py-3 text-center w-[12%]">Sr. No.</th>
                <th className="border border-black px-4 py-3 text-center w-[52%]">Product name</th>
                <th className="border border-black px-4 py-3 text-center w-[18%]">Pack</th>
                <th className="border border-black px-4 py-3 text-center w-[18%]">Qty.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10*10";
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-4 py-3 text-center">{index + 1}.</td>
                    <td className="border border-black px-4 py-3">{item.stockItemName}</td>
                    <td className="border border-black px-4 py-3 text-center">{packing}</td>
                    <td className="border border-black px-4 py-3 text-center">{item.quantity}TAB</td>
                  </tr>
                );
              })}
              {/* Empty rows for consistency */}
              {items.length < 4 && Array.from({ length: 4 - items.length }).map((_, idx) => (
                <tr key={`empty-${idx}`}>
                  <td className="border border-black px-4 py-3 text-center">&nbsp;</td>
                  <td className="border border-black px-4 py-3">&nbsp;</td>
                  <td className="border border-black px-4 py-3 text-center">&nbsp;</td>
                  <td className="border border-black px-4 py-3 text-center">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Flex spacer to push footer to bottom */}
          <div className="flex-1 min-h-6"></div>

          {/* Footer Section */}
          <div className="mt-auto text-[13pt] ml-10 leading-relaxed">
            <p>For our centre Navjeevan hospital at below written address at the earliest.</p>
            <p className="mt-4">Address: Navjeevan hospital Opp.Busstand,Vill.Bara,Sirhind,distt. Fatehgarh sahib.</p>
            <p className="mt-5">Thanking you</p>
            <p>Yours Sincerely,</p>
            <p className="mt-4">Navjeevanhospital,Sirhind</p>
            <p>Date: {formatDateSlash(poDate)}</p>
            <p className="mt-4">OPP.NEW BUS STAND,</p>
            <p>G.T.ROAD, BARA ,SIRHIND</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
