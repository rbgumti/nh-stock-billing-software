import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import jsPDF from "jspdf";

interface RusanPharmaPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function RusanPharmaPO({ poNumber, poDate, items, stockItems, onClose }: RusanPharmaPOProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { doctorName } = useAppSettings();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' }).replace(/\//g, '-');
  };

  // Extract PO number suffix (e.g., "187" from "NH/PO-0187")
  const getPONumberSuffix = () => {
    const match = poNumber.match(/(\d+)$/);
    return match ? parseInt(match[1]).toString() : poNumber;
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
            body { font-family: 'Times New Roman', Times, serif; padding: 20px 25px; font-size: 14px; line-height: 1.5; }
            .header-row { display: flex; justify-content: flex-end; margin-bottom: 5px; font-size: 13px; }
            .hospital-name { font-size: 26px; font-weight: bold; text-align: center; margin: 8px 0; }
            .address-row { text-align: center; font-size: 13px; margin-bottom: 5px; }
            .licence-row { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 14px; }
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 14px; font-weight: bold; }
            .to-section { margin-bottom: 10px; font-size: 13px; line-height: 1.6; }
            .sub-line { font-size: 15px; font-weight: bold; margin: 12px 0; text-decoration: underline; }
            .salutation { margin: 10px 0; font-size: 13px; }
            .intro-para { font-size: 13px; text-align: justify; margin-bottom: 12px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
            th, td { border: 1px solid #000; padding: 8px 10px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .undertaking-title { font-weight: bold; font-size: 14px; margin: 14px 0 8px 0; text-decoration: underline; }
            .undertaking-text { font-size: 12px; text-align: justify; line-height: 1.5; margin-bottom: 14px; }
            .for-line { font-size: 13px; margin: 18px 0 35px 0; }
            .signature-section { display: flex; justify-content: flex-start; margin-top: 12px; font-size: 13px; }
            @media print {
              body { padding: 10mm 15mm; }
              @page { margin: 10mm; size: A4; }
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
    const leftMargin = 15;
    let y = 18;

    // Header row - Regd on right side
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    pdf.text('Regd. Govt of Punjab', pageWidth - leftMargin, y, { align: 'right' });
    y += 10;

    // Hospital Name (centered) - bold and larger
    pdf.setFontSize(24);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Address
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib,', pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Mobile
    pdf.text('Mob: 6284942412', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Licence with pipe separator - bold
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text('Licence No.: PSMHC/Pb./2024/863 | Dt. 2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // PO Number and Date - bold
    pdf.setFontSize(13);
    pdf.setFont('times', 'bold');
    pdf.text(`PO No.: NH-25-26-${getPONumberSuffix()}`, leftMargin, y);
    pdf.text(`Date: ${formatDate(poDate)}`, pageWidth - leftMargin, y, { align: 'right' });
    y += 12;

    // To Section
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    pdf.text('To: Rusan Pharma Ltd.,', leftMargin, y);
    y += 6;
    pdf.text('Khasra No. 122MI, Central Hope Town, Selaqui, Dehradun, Uttarakhand-248197', leftMargin, y);
    y += 12;

    // Subject line - bold and underlined
    pdf.setFontSize(13);
    pdf.setFont('times', 'bold');
    pdf.text('Subject: Purchase Order', leftMargin, y);
    // Draw underline
    const subjectWidth = pdf.getTextWidth('Subject: Purchase Order');
    pdf.line(leftMargin, y + 1, leftMargin + subjectWidth, y + 1);
    y += 10;

    // Salutation
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    pdf.text("Dear Sir/Madam,", leftMargin, y);
    y += 8;

    // Intro paragraph
    pdf.setFontSize(12);
    const introText = "We place a purchase order with authorized doctor's stamp and signature. Terms per telephone discussion. Payment by cheque to your bank account.";
    const splitIntro = pdf.splitTextToSize(introText, pageWidth - 30);
    pdf.text(splitIntro, leftMargin, y);
    y += splitIntro.length * 6 + 8;

    // Table
    const tableHeaders = ['Sr.', 'Product', 'Compositions', 'Pack', 'Strips', 'Tablets'];
    const colWidths = [12, 30, 60, 18, 25, 30];
    let x = leftMargin;

    // Table header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(x, y, pageWidth - 30, 8, 'F');
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    tableHeaders.forEach((header, i) => {
      pdf.rect(x + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, colWidths[i], 8);
      pdf.text(header, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + colWidths[i] / 2, y + 5.5, { align: 'center' });
    });
    y += 8;

    // Table rows
    pdf.setFontSize(11);
    pdf.setFont('times', 'normal');
    items.forEach((item, index) => {
      const stockItem = getStockItemDetails(item.stockItemId);
      const packing = stockItem?.packing || "10×10";
      const packingMatch = packing.match(/(\d+)[×x*](\d+)/i);
      const tabletsPerStrip = packingMatch ? parseInt(packingMatch[1]) * parseInt(packingMatch[2]) : 10;
      const qtyInTablets = item.quantity * tabletsPerStrip;

      const rowData = [
        `${index + 1}`,
        item.stockItemName,
        stockItem?.composition || '-',
        packing.replace('*', '×'),
        item.quantity.toLocaleString(),
        qtyInTablets.toLocaleString()
      ];

      let cellX = x;
      rowData.forEach((cell, i) => {
        pdf.rect(cellX, y, colWidths[i], 8);
        const align = i === 0 || i === 3 ? 'center' : i >= 4 ? 'right' : 'left';
        const textX = align === 'center' ? cellX + colWidths[i] / 2 : align === 'right' ? cellX + colWidths[i] - 2 : cellX + 2;
        // Truncate long text to fit
        let displayText = cell;
        if (i === 2) { // Compositions column - may need truncation
          const maxWidth = colWidths[i] - 4;
          while (pdf.getTextWidth(displayText) > maxWidth && displayText.length > 3) {
            displayText = displayText.slice(0, -4) + '...';
          }
        }
        pdf.text(displayText, textX, y + 5.5, { align });
        cellX += colWidths[i];
      });
      y += 8;
    });
    y += 10;

    // Undertaking
    pdf.setFont('times', 'bold');
    pdf.setFontSize(12);
    pdf.text('UNDERTAKING:', leftMargin, y);
    // Draw underline
    const undertakingWidth = pdf.getTextWidth('UNDERTAKING:');
    pdf.line(leftMargin, y + 1, leftMargin + undertakingWidth, y + 1);
    y += 7;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(11);
    const undertakingText = `We confirm purchase from Rusan Pharma Ltd. under P.O. No. ${getPONumberSuffix()}/A (${formatDate(poDate)}). These controlled substances per Narcotic Drugs and Psychotropic Substances Act, 1985, shall be maintained with full records. Form-6 (Consignment Note) will be submitted upon receipt. Products are exclusively for our De-addiction Centre and qualified doctors only, licensed under PSMHC/Punjab/2024/863, sales within India only, no retail or export. Rusan Pharma Ltd. not liable for non-compliance by us.`;
    const splitUndertaking = pdf.splitTextToSize(undertakingText, pageWidth - 30);
    pdf.text(splitUndertaking, leftMargin, y);
    y += splitUndertaking.length * 5 + 12;

    // For line
    pdf.setFontSize(12);
    pdf.text('For Navjeevan Hospital,', leftMargin, y);
    y += 6;
    pdf.text('Opp. New Bus Stand, G.T. Road, Sirhind', leftMargin, y);
    y += 20;

    // Signature line
    pdf.line(leftMargin, y, leftMargin + 50, y);
    y += 6;

    // Dr name and date
    pdf.setFontSize(12);
    pdf.text(doctorName, leftMargin, y);
    pdf.text(`Date: ${formatDate(poDate)}`, leftMargin + 60, y);

    pdf.save(`PO-${poNumber}-Rusan-Pharma.pdf`);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Rusan Pharma Purchase Order Format</span>
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
          {/* Header Row - Regd on right */}
          <div className="flex justify-end text-[13px] mb-2">
            <span>Regd. Govt of Punjab</span>
          </div>

          {/* Hospital Name */}
          <h1 className="text-2xl font-bold text-center my-2">NAVJEEVAN HOSPITAL</h1>

          {/* Address Row */}
          <p className="text-center text-[13px] mb-1">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib,
          </p>

          {/* Mobile */}
          <p className="text-center text-[13px] mb-2">
            Mob: 6284942412
          </p>

          {/* Licence Row with pipe separator */}
          <p className="text-center text-[12px] font-bold mb-4">
            Licence No.: PSMHC/Pb./2024/863 | Dt. 2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[14px] mb-5">
            <span>PO No.: NH-25-26-{getPONumberSuffix()}</span>
            <span>Date: {formatDate(poDate)}</span>
          </div>

          {/* To Section - inline format */}
          <div className="text-[13px] mb-3 leading-relaxed">
            <p className="mb-1">To: <span className="font-bold">Rusan Pharma Ltd.,</span></p>
            <p>Khasra No. 122MI, Central Hope Town, Selaqui, Dehradun, Uttarakhand-248197</p>
          </div>

          {/* Subject line */}
          <p className="font-bold text-[15px] my-4 underline">Subject: Purchase Order</p>

          {/* Salutation */}
          <p className="text-[13px] my-3">Dear Sir/Madam,</p>

          {/* Intro Paragraph - concise version */}
          <p className="text-[13px] text-justify mb-4 leading-relaxed">
            We place a purchase order with authorized doctor&apos;s stamp and signature. Terms per telephone discussion. Payment by cheque to your bank account.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse my-4 text-[13px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-2 text-center">Sr.</th>
                <th className="border border-black px-2 py-2 text-center">Product</th>
                <th className="border border-black px-2 py-2 text-center">Compositions</th>
                <th className="border border-black px-2 py-2 text-center">Pack</th>
                <th className="border border-black px-2 py-2 text-center">Strips</th>
                <th className="border border-black px-2 py-2 text-center">Tablets</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10×10";
                const packingMatch = packing.match(/(\d+)[×x*](\d+)/i);
                const tabletsPerStrip = packingMatch ? parseInt(packingMatch[1]) * parseInt(packingMatch[2]) : 10;
                const qtyInTablets = item.quantity * tabletsPerStrip;
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-black px-2 py-2">{item.stockItemName}</td>
                    <td className="border border-black px-2 py-2">{stockItem?.composition || '-'}</td>
                    <td className="border border-black px-2 py-2 text-center">{packing.replace('*', '×')}</td>
                    <td className="border border-black px-2 py-2 text-right">{item.quantity.toLocaleString()}</td>
                    <td className="border border-black px-2 py-2 text-right">{qtyInTablets.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Undertaking */}
          <p className="font-bold text-[14px] mb-2 underline">UNDERTAKING:</p>
          <p className="text-[12px] text-justify leading-relaxed mb-5">
            We confirm purchase from Rusan Pharma Ltd. under P.O. No. {getPONumberSuffix()}/A ({formatDate(poDate)}). These controlled substances per Narcotic Drugs and Psychotropic Substances Act, 1985, shall be maintained with full records. Form-6 (Consignment Note) will be submitted upon receipt. Products are exclusively for our De-addiction Centre and qualified doctors only, licensed under PSMHC/Punjab/2024/863, sales within India only, no retail or export. Rusan Pharma Ltd. not liable for non-compliance by us.
          </p>

          <p className="text-[13px] mb-1">
            For Navjeevan Hospital,
          </p>
          <p className="text-[13px] mb-4">
            Opp. New Bus Stand, G.T. Road, Sirhind
          </p>

          {/* Space for stamp and signature */}
          <div className="h-12 my-3 border-b border-black w-48">
            {/* Space for stamp and signature */}
          </div>

          {/* Signature Section */}
          <div className="flex gap-16 items-end text-[13px]">
            <p>{doctorName}</p>
            <p>Date: {formatDate(poDate)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
