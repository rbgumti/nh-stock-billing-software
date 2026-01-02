import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import jsPDF from "jspdf";

interface VeeEssPharmaPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function VeeEssPharmaPO({ poNumber, poDate, items, stockItems, onClose }: VeeEssPharmaPOProps) {
  const printRef = useRef<HTMLDivElement>(null);

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
            body { font-family: 'Times New Roman', Times, serif; padding: 15px 25px; font-size: 14px; line-height: 1.6; }
            .header-row { text-align: center; font-size: 14px; margin-bottom: 6px; }
            .header-section { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
            .logo { width: 32px; height: 32px; object-fit: contain; }
            .hospital-name { font-size: 26px; font-weight: bold; flex: 1; text-align: center; }
            .address-row { text-align: center; font-size: 14px; margin-bottom: 4px; }
            .licence-row { text-align: center; font-size: 13px; margin-bottom: 12px; }
            .ref-po-section { text-align: center; font-size: 14px; margin-bottom: 10px; }
            .to-section { margin-bottom: 12px; font-size: 14px; line-height: 1.6; margin-left: 25px; }
            .subject-section { margin-left: 25px; font-size: 14px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }
            th, td { border: 1px solid #000; padding: 8px 10px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            .footer-section { font-size: 14px; margin-top: 16px; margin-left: 25px; line-height: 1.6; }
            .signature-section { font-size: 14px; margin-top: 16px; margin-left: 25px; line-height: 1.6; }
            @media print {
              body { padding: 12mm 18mm; }
              @page { margin: 12mm; size: A4; }
            }
          </style>
        </head>
        <body>
          ${printHTML}
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
    let y = 18;

    // Header row - centered and bold
    pdf.setFontSize(13);
    pdf.setFont('times', 'bold');
    pdf.text('Regd. Govt of Punjab', pageWidth / 2, y, { align: 'center' });
    y += 6;
    pdf.text('Mob: 6284942412', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Hospital Name (centered) - bold
    pdf.setFontSize(24);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y + 6, { align: 'center' });
    y += 18;

    // Address - bold
    pdf.setFontSize(13);
    pdf.setFont('times', 'bold');
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib    Dr. Metalli Bhatti', pageWidth / 2, y, { align: 'center' });
    y += 7;

    // Licence - bold
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text('Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // PO Number and Date - bold
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.text(`PO NO: ${poNumber}`, 20, y);
    pdf.text(`DATE: ${formatDate(poDate)}`, pageWidth - 20, y, { align: 'right' });
    y += 10;

    // To Section
    pdf.setFontSize(13);
    pdf.setFont('times', 'normal');
    const leftMargin = 30;
    pdf.text('To', leftMargin, y);
    y += 6;
    pdf.setFont('times', 'bold');
    pdf.text('VEE ESS PHARMACEUTICALS', leftMargin, y);
    y += 6;
    pdf.setFont('times', 'normal');
    pdf.text('PATRAN ROAD DRB,SANGRUR', leftMargin, y);
    y += 6;
    pdf.text('PUNJAB-148035', leftMargin, y);
    y += 8;

    pdf.text('Subject:Medicine order', leftMargin, y);
    y += 7;
    pdf.text("Dear Sir,Ma'am", leftMargin, y);
    y += 7;
    pdf.text('Kindly provide us :-', leftMargin, y);
    y += 10;

    // Table
    const tableHeaders = ['Sr. No.', 'Product name', 'Pack', 'Qty.'];
    const colWidths = [20, 90, 35, 35];
    let x = 10;

    // Table header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(x, y, pageWidth - 20, 10, 'F');
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    tableHeaders.forEach((header, i) => {
      pdf.text(header, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + colWidths[i] / 2, y + 7, { align: 'center' });
    });
    pdf.rect(x, y, pageWidth - 20, 10);
    y += 10;

    // Table rows
    pdf.setFontSize(12);
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
        pdf.rect(cellX, y, colWidths[i], 9);
        const align = i === 0 || i >= 2 ? 'center' : 'left';
        const textX = align === 'center' ? cellX + colWidths[i] / 2 : cellX + 3;
        pdf.text(cell, textX, y + 6.5, { align });
        cellX += colWidths[i];
      });
      y += 9;
    });

    // Empty rows
    const emptyRows = Math.max(0, 4 - items.length);
    for (let i = 0; i < emptyRows; i++) {
      let cellX = x;
      colWidths.forEach((width) => {
        pdf.rect(cellX, y, width, 9);
        cellX += width;
      });
      y += 9;
    }
    y += 10;

    // Footer Section
    pdf.setFontSize(13);
    pdf.text('For our centre Navjeevan hospital at below written address at the earliest.', leftMargin, y);
    y += 7;
    pdf.text('Address: Navjeevan hospital Opp.Busstand,Vill.Bara,Sirhind,distt. Fatehgarh sahib.', leftMargin, y);
    y += 8;
    pdf.text('Thanking you', leftMargin, y);
    y += 6;
    pdf.text('Yours Sincerely,', leftMargin, y);
    y += 7;
    pdf.text('Navjeevanhospital,Sirhind', leftMargin, y);
    y += 6;
    pdf.text(`Date: ${formatDateSlash(poDate)}`, leftMargin, y);
    y += 7;
    pdf.text('OPP.NEW BUS STAND,', leftMargin, y);
    y += 6;
    pdf.text('G.T.ROAD, BARA ,SIRHIND', leftMargin, y);

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

        <div ref={printRef} className="p-6 bg-white text-black" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '14px', lineHeight: '1.6' }}>
          {/* Header Row - Centered */}
          <div className="text-center text-[14px] font-bold mb-3">
            <p>Regd. Govt of Punjab</p>
            <p>Mob: 6284942412</p>
          </div>

          {/* Hospital Header */}
          <div className="my-3">
            <h1 className="text-[26px] font-bold text-center">NAVJEEVAN HOSPITAL</h1>
          </div>

          {/* Address Row */}
          <p className="text-center text-[14px] font-bold mb-2">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;Dr. Metalli Bhatti
          </p>

          {/* Licence Row */}
          <p className="text-center text-[13px] font-bold mb-5">
            Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024
          </p>

          {/* PO NO and Date */}
          <div className="flex justify-between text-[16px] font-bold mb-5 px-10">
            <span>PO NO: {poNumber}</span>
            <span>DATE: {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[14px] mb-4 leading-relaxed ml-20">
            <p className="mb-1">To</p>
            <p className="font-bold">VEE ESS PHARMACEUTICALS</p>
            <p>PATRAN ROAD DRB,SANGRUR</p>
            <p>PUNJAB-148035</p>
            <p className="mt-3">Subject:Medicine order</p>
            <p className="mt-3">Dear Sir,Ma&apos;am</p>
            <p className="mt-3">Kindly provide us :-</p>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4 text-[14px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-4 py-2 text-center">Sr. No.</th>
                <th className="border border-black px-4 py-2 text-center">Product name</th>
                <th className="border border-black px-4 py-2 text-center">Pack</th>
                <th className="border border-black px-4 py-2 text-center">Qty.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10*10";
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-4 py-2 text-center">{index + 1}.</td>
                    <td className="border border-black px-4 py-2">{item.stockItemName}</td>
                    <td className="border border-black px-4 py-2 text-center">{packing}</td>
                    <td className="border border-black px-4 py-2 text-center">{item.quantity}TAB</td>
                  </tr>
                );
              })}
              {/* Empty rows for consistency */}
              {items.length < 4 && Array.from({ length: 4 - items.length }).map((_, idx) => (
                <tr key={`empty-${idx}`}>
                  <td className="border border-black px-4 py-2 text-center">&nbsp;</td>
                  <td className="border border-black px-4 py-2">&nbsp;</td>
                  <td className="border border-black px-4 py-2 text-center">&nbsp;</td>
                  <td className="border border-black px-4 py-2 text-center">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Section */}
          <div className="text-[14px] mt-5 ml-20 leading-relaxed">
            <p>For our centre Navjeevan hospital at below written address at the earliest.</p>
            <p className="mt-3">Address: Navjeevan hospital Opp.Busstand,Vill.Bara,Sirhind,distt. Fatehgarh sahib.</p>
            <p className="mt-4">Thanking you</p>
            <p>Yours Sincerely,</p>
            <p className="mt-3">Navjeevanhospital,Sirhind</p>
            <p>Date: {formatDateSlash(poDate)}</p>
            <p className="mt-3">OPP.NEW BUS STAND,</p>
            <p>G.T.ROAD, BARA ,SIRHIND</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
