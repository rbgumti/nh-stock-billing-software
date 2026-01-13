import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import jsPDF from "jspdf";
import { useAppSettings } from "@/hooks/usePerformanceMode";

interface NeuroglamPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function NeuroglamPO({ poNumber, poDate, items, stockItems, onClose }: NeuroglamPOProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { doctorName } = useAppSettings();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' }).replace(/\//g, '-');
  };

  const getMonthYear = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${month} ${year}`;
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
              margin: 10mm 12mm;
            }
            html, body { 
              height: 100%; 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 11pt; 
              line-height: 1.4;
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
            .header-regd { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 4px; }
            .hospital-name { font-size: 22pt; font-weight: bold; text-align: center; margin: 6px 0; }
            .address-row { text-align: center; font-size: 10pt; margin-bottom: 3px; }
            .doctor-name { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 3px; }
            .licence-row { text-align: center; font-size: 10pt; margin-bottom: 12px; }
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12pt; font-weight: bold; }
            .to-section { margin-bottom: 10px; font-size: 11pt; line-height: 1.5; }
            .subject-row { font-size: 12pt; font-weight: bold; text-align: center; margin: 10px 0; }
            .salutation { margin: 8px 0; font-size: 11pt; }
            .intro-para { font-size: 10pt; text-align: justify; margin-bottom: 10px; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
            th, td { border: 1px solid #000; padding: 6px 8px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .flex-spacer { flex: 1; min-height: 20px; }
            .undertaking-section { margin-top: auto; }
            .undertaking-title { font-weight: bold; font-size: 11pt; margin: 10px 0 6px 0; }
            .undertaking-text { font-size: 9pt; text-align: justify; line-height: 1.35; margin-bottom: 6px; }
            .liability-title { font-weight: bold; font-size: 11pt; margin: 10px 0 6px 0; }
            .liability-text { font-size: 9pt; text-align: justify; line-height: 1.35; margin-bottom: 10px; }
            .for-section { font-size: 10pt; margin-top: 12px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 25px; font-size: 11pt; }
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
    let y = 15;

    // Regd. Govt of Punjab - centered and bold
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text('Regd. Govt of Punjab', pageWidth / 2, y, { align: 'center' });
    y += 7;

    // Hospital Name - bold
    pdf.setFontSize(22);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Address
    pdf.setFontSize(11);
    pdf.setFont('times', 'normal');
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib', pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Doctor Name - bold
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text(doctorName, pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Licence
    pdf.setFontSize(11);
    pdf.setFont('times', 'normal');
    pdf.text('Licence No. PSMHC/Pb./2024/863 Dt. 2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // PO Number and Date - bold
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text(`PO NO: ${poNumber}`, leftMargin, y);
    pdf.text(`DATE: ${formatDate(poDate)}`, pageWidth - rightMargin, y, { align: 'right' });
    y += 12;

    // To Section
    pdf.setFontSize(11);
    pdf.setFont('times', 'normal');
    pdf.text('To,', leftMargin, y);
    y += 5;
    pdf.setFont('times', 'bold');
    pdf.text('Neuroglam', leftMargin, y);
    y += 5;
    pdf.setFont('times', 'normal');
    pdf.text('Address: Village – Ajnoud, Tehsil – Payal', leftMargin, y);
    y += 5;
    pdf.text('Ludhiana – 141421 (Punjab)', leftMargin, y);
    y += 10;

    // Subject - centered bold
    pdf.setFont('times', 'bold');
    pdf.setFontSize(12);
    pdf.text('Sub: Purchase Order', pageWidth / 2, y, { align: 'center' });
    y += 8;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(11);
    pdf.text("Dear Sir, ma'am", leftMargin, y);
    y += 7;

    // Intro paragraph
    pdf.setFontSize(10);
    const introText = "We hereby placing a purchase order with Stamp and Sign of our current working doctor's. Terms and Conditions will remain same as our discussion on phonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.";
    const splitIntro = pdf.splitTextToSize(introText, contentWidth);
    pdf.text(splitIntro, leftMargin, y);
    y += splitIntro.length * 4.5 + 6;

    // Table - Calculate row height based on items
    const tableHeaders = ['Sr. No.', 'Product Name', 'Compositions', 'Packing', 'Qty.In Strips', 'Qty.In Tablets'];
    const colWidths = [14, 38, 58, 20, 25, 25];
    let x = leftMargin;

    // Calculate available space for table
    const tableStartY = y;
    const reservedBottomSpace = 85; // Space needed for undertaking + signature
    const availableTableHeight = pageHeight - tableStartY - reservedBottomSpace;
    const minRowHeight = 7;
    const headerHeight = 8;
    const rowHeight = Math.max(minRowHeight, Math.min(12, (availableTableHeight - headerHeight) / Math.max(items.length, 1)));

    // Table header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(x, y, contentWidth, headerHeight, 'F');
    pdf.setFontSize(10);
    pdf.setFont('times', 'bold');
    tableHeaders.forEach((header, i) => {
      pdf.rect(x + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, colWidths[i], headerHeight);
      pdf.text(header, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + colWidths[i] / 2, y + 5.5, { align: 'center' });
    });
    y += headerHeight;

    // Table rows
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    items.forEach((item, index) => {
      const stockItem = getStockItemDetails(item.stockItemId);
      const packing = item.packSize || stockItem?.packing || "10*10";
      const qtyInStrips = item.qtyInStrips || item.quantity;
      const qtyInTabs = item.qtyInTabs || qtyInStrips * 10;

      const rowData = [
        `${index + 1}.`,
        item.stockItemName,
        stockItem?.composition || '-',
        packing,
        qtyInStrips.toLocaleString(),
        qtyInTabs.toLocaleString()
      ];

      let cellX = x;
      rowData.forEach((cell, i) => {
        pdf.rect(cellX, y, colWidths[i], rowHeight);
        const align = i === 0 || i === 3 ? 'center' : i >= 4 ? 'right' : 'left';
        const textX = align === 'center' ? cellX + colWidths[i] / 2 : align === 'right' ? cellX + colWidths[i] - 2 : cellX + 2;
        const maxWidth = colWidths[i] - 4;
        let displayText = cell;
        while (pdf.getTextWidth(displayText) > maxWidth && displayText.length > 3) {
          displayText = displayText.slice(0, -1);
        }
        if (displayText !== cell) displayText += '...';
        pdf.text(displayText, textX, y + rowHeight / 2 + 1.5, { align });
        cellX += colWidths[i];
      });
      y += rowHeight;
    });

    // Calculate remaining space and position undertaking section at bottom
    const undertakingY = pageHeight - reservedBottomSpace + 5;
    y = undertakingY;

    // Undertaking
    pdf.setFont('times', 'bold');
    pdf.setFontSize(11);
    pdf.text('UNDERTAKING:', leftMargin, y);
    y += 5;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    const undertaking1 = `We hereby confirm that the product containing the psychotropic substance Buprenorphine, which we intend to procure from Neuroglam, Village Ajnoud, Tehsil Payal, Ludhiana – 141421 (Punjab), is covered under our Purchase Order No. ${poNumber.replace('NH/PO-', '')} dated ${formatDate(poDate)} (${getMonthYear(poDate)}).`;
    const splitUndertaking1 = pdf.splitTextToSize(undertaking1, contentWidth);
    pdf.text(splitUndertaking1, leftMargin, y);
    y += splitUndertaking1.length * 3.5 + 2;

    const undertaking2 = `The products purchased by us will be exclusively supplied to De-Addiction Centres and qualified Doctors under our valid License No. PSMHC/Punjab/2024/863. We are fully aware that this product contains controlled substances regulated under the Narcotic Drugs and Psychotropic Substances Act, 1985, and we shall maintain all statutory records pertaining to its sale and purchase.`;
    const splitUndertaking2 = pdf.splitTextToSize(undertaking2, contentWidth);
    pdf.text(splitUndertaking2, leftMargin, y);
    y += splitUndertaking2.length * 3.5 + 2;

    const undertaking3 = `We further assure that an Acknowledgement (Form-6 Consignment Note) for the receipt of the above substance will be issued to the supplier immediately upon delivery.`;
    const splitUndertaking3 = pdf.splitTextToSize(undertaking3, contentWidth);
    pdf.text(splitUndertaking3, leftMargin, y);
    y += splitUndertaking3.length * 3.5 + 2;

    const undertaking4 = `Additionally, we undertake that the procured product will be used only for the formulations and sales mentioned below and will be marketed within India only. These products are not intended for retail counter sale or export.`;
    const splitUndertaking4 = pdf.splitTextToSize(undertaking4, contentWidth);
    pdf.text(splitUndertaking4, leftMargin, y);
    y += splitUndertaking4.length * 3.5 + 4;

    // Neuroglam Liability Acknowledgment
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('Neuroglam Liability Acknowledgment', leftMargin, y);
    y += 5;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    const liability = `We acknowledge that Neuroglam shall not be held liable for any non-compliance with statutory provisions committed by us, whether intentionally or unintentionally.`;
    const splitLiability = pdf.splitTextToSize(liability, contentWidth);
    pdf.text(splitLiability, leftMargin, y);
    y += splitLiability.length * 3.5 + 6;

    // For section
    pdf.setFontSize(10);
    pdf.text('For Navjeevanhospital, opp. New Bus Stand, G.t. Road, Sirhind', leftMargin, y);
    y += 12;

    // Signature section - positioned at bottom
    pdf.setFontSize(11);
    pdf.text(`Date: ${formatDate(poDate)}`, leftMargin, y);
    pdf.text('(Navjeevanhospital)', pageWidth / 2, y, { align: 'center' });
    pdf.text(`(${doctorName}.)`, pageWidth - rightMargin, y, { align: 'right' });

    pdf.save(`PO-${poNumber}-Neuroglam.pdf`);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Neuroglam Purchase Order Format</span>
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

        <div ref={printRef} className="p-6 bg-white text-black min-h-[842px] flex flex-col" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt', lineHeight: '1.4' }}>
          {/* Regd. Govt of Punjab */}
          <p className="text-center text-[12pt] font-bold mb-1">Regd. Govt of Punjab</p>

          {/* Hospital Name */}
          <h1 className="text-[22pt] font-bold text-center my-2">NAVJEEVAN HOSPITAL</h1>

          {/* Address */}
          <p className="text-center text-[11pt] mb-1">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib
          </p>

          {/* Doctor Name */}
          <p className="text-center text-[12pt] font-bold mb-1">{doctorName}</p>

          {/* Licence Row */}
          <p className="text-center text-[11pt] mb-4">
            Licence No. PSMHC/Pb./2024/863 Dt. 2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[12pt] mb-4">
            <span>PO NO: {poNumber}</span>
            <span>DATE: {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[11pt] mb-3 leading-snug">
            <p className="mb-1">To,</p>
            <p className="font-bold">Neuroglam</p>
            <p>Address: Village – Ajnoud, Tehsil – Payal</p>
            <p>Ludhiana – 141421 (Punjab)</p>
          </div>

          {/* Subject - centered bold */}
          <p className="text-[12pt] font-bold text-center my-3">Sub: Purchase Order</p>

          {/* Salutation */}
          <p className="text-[11pt] my-2">Dear Sir, ma&apos;am</p>

          {/* Intro Paragraph */}
          <p className="text-[10pt] text-justify mb-3 leading-snug">
            We hereby placing a purchase order with Stamp and Sign of our current working doctor&apos;s. Terms and Conditions will remain same as our discussion on phonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-3 text-[10pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-2 text-center">Sr. No.</th>
                <th className="border border-black px-2 py-2 text-center">Product Name</th>
                <th className="border border-black px-2 py-2 text-center">Compositions</th>
                <th className="border border-black px-2 py-2 text-center">Packing</th>
                <th className="border border-black px-2 py-2 text-center">Qty.In Strips</th>
                <th className="border border-black px-2 py-2 text-center">Qty.In Tablets</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = item.packSize || stockItem?.packing || "10*10";
                const qtyInStrips = item.qtyInStrips || item.quantity;
                const qtyInTabs = item.qtyInTabs || qtyInStrips * 10;
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-2 py-2 text-center">{index + 1}.</td>
                    <td className="border border-black px-2 py-2">{item.stockItemName}</td>
                    <td className="border border-black px-2 py-2">{stockItem?.composition || '-'}</td>
                    <td className="border border-black px-2 py-2 text-center">{packing}</td>
                    <td className="border border-black px-2 py-2 text-right">{qtyInStrips.toLocaleString()}</td>
                    <td className="border border-black px-2 py-2 text-right">{qtyInTabs.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Flex spacer to push undertaking to bottom */}
          <div className="flex-1 min-h-4"></div>

          {/* Undertaking */}
          <div className="mt-auto">
            <p className="font-bold text-[11pt] mb-2">UNDERTAKING:</p>
            <p className="text-[9pt] text-justify leading-snug mb-1">
              We hereby confirm that the product containing the psychotropic substance Buprenorphine, which we intend to procure from Neuroglam, Village Ajnoud, Tehsil Payal, Ludhiana – 141421 (Punjab), is covered under our Purchase Order No. {poNumber.replace('NH/PO-', '')} dated {formatDate(poDate)} ({getMonthYear(poDate)}).
            </p>
            <p className="text-[9pt] text-justify leading-snug mb-1">
              The products purchased by us will be exclusively supplied to De-Addiction Centres and qualified Doctors under our valid License No. PSMHC/Punjab/2024/863. We are fully aware that this product contains controlled substances regulated under the Narcotic Drugs and Psychotropic Substances Act, 1985, and we shall maintain all statutory records pertaining to its sale and purchase.
            </p>
            <p className="text-[9pt] text-justify leading-snug mb-1">
              We further assure that an Acknowledgement (Form-6 Consignment Note) for the receipt of the above substance will be issued to the supplier immediately upon delivery.
            </p>
            <p className="text-[9pt] text-justify leading-snug mb-2">
              Additionally, we undertake that the procured product will be used only for the formulations and sales mentioned below and will be marketed within India only. These products are not intended for retail counter sale or export.
            </p>

            {/* Neuroglam Liability Acknowledgment */}
            <p className="font-bold text-[10pt] mb-1">Neuroglam Liability Acknowledgment</p>
            <p className="text-[9pt] text-justify leading-snug mb-3">
              We acknowledge that Neuroglam shall not be held liable for any non-compliance with statutory provisions committed by us, whether intentionally or unintentionally.
            </p>

            <p className="text-[10pt] mb-4">
              For Navjeevanhospital, opp. New Bus Stand, G.t. Road, Sirhind
            </p>

            {/* Signature Section */}
            <div className="flex justify-between text-[11pt] mt-4">
              <span>Date: {formatDate(poDate)}</span>
              <span>(Navjeevanhospital)</span>
              <span>({doctorName}.)</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
