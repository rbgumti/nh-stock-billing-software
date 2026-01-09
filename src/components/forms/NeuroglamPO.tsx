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
            body { font-family: 'Times New Roman', Times, serif; padding: 10mm 15mm; font-size: 12px; line-height: 1.3; }
            .header-regd { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 2px; }
            .hospital-name { font-size: 22px; font-weight: bold; text-align: center; margin: 4px 0; }
            .address-row { text-align: center; font-size: 11px; margin-bottom: 2px; }
            .doctor-name { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 2px; }
            .licence-row { text-align: center; font-size: 11px; margin-bottom: 8px; }
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; font-weight: bold; }
            .to-section { margin-bottom: 6px; font-size: 11px; line-height: 1.3; }
            .subject-row { font-size: 12px; font-weight: bold; text-align: center; margin: 6px 0; }
            .salutation { margin: 4px 0; font-size: 11px; }
            .intro-para { font-size: 11px; text-align: justify; margin-bottom: 6px; line-height: 1.3; }
            table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
            th, td { border: 1px solid #000; padding: 4px 6px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .undertaking-title { font-weight: bold; font-size: 11px; margin: 6px 0 4px 0; }
            .undertaking-text { font-size: 10px; text-align: justify; line-height: 1.25; margin-bottom: 4px; }
            .liability-title { font-weight: bold; font-size: 11px; margin: 6px 0 4px 0; }
            .liability-text { font-size: 10px; text-align: justify; line-height: 1.25; margin-bottom: 6px; }
            .for-section { font-size: 11px; margin-top: 8px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 20px; font-size: 11px; }
            @media print {
              body { padding: 8mm 12mm; }
              @page { margin: 8mm; size: A4; }
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
    let y = 12;

    // Regd. Govt of Punjab - centered and bold
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text('Regd. Govt of Punjab', pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Hospital Name - bold
    pdf.setFontSize(20);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Address
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib', pageWidth / 2, y, { align: 'center' });
    y += 5;

    // Doctor Name - bold
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text(doctorName, pageWidth / 2, y, { align: 'center' });
    y += 5;

    // Licence
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.text('Licence No. PSMHC/Pb./2024/863 Dt. 2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // PO Number and Date - bold
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text(`PO NO: ${poNumber}`, 15, y);
    pdf.text(`DATE: ${formatDate(poDate)}`, pageWidth - 15, y, { align: 'right' });
    y += 8;

    // To Section
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.text('To,', 15, y);
    y += 4;
    pdf.setFont('times', 'bold');
    pdf.text('Neuroglam', 15, y);
    y += 4;
    pdf.setFont('times', 'normal');
    pdf.text('Address: Village – Ajnoud, Tehsil – Payal', 15, y);
    y += 4;
    pdf.text('Ludhiana – 141421 (Punjab)', 15, y);
    y += 7;

    // Subject - centered bold
    pdf.setFont('times', 'bold');
    pdf.setFontSize(11);
    pdf.text('Sub: Purchase Order', pageWidth / 2, y, { align: 'center' });
    y += 6;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(10);
    pdf.text("Dear Sir, ma'am", 15, y);
    y += 5;

    // Intro paragraph
    pdf.setFontSize(9);
    const introText = "We hereby placing a purchase order with Stamp and Sign of our current working doctor's. Terms and Conditions will remain same as our discussion on phonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.";
    const splitIntro = pdf.splitTextToSize(introText, pageWidth - 30);
    pdf.text(splitIntro, 15, y);
    y += splitIntro.length * 3.5 + 3;

    // Table
    const tableHeaders = ['Sr. No.', 'Product Name', 'Compositions', 'Packing', 'Qty.In Strips', 'Qty.In Tablets'];
    const colWidths = [12, 40, 55, 18, 25, 28];
    let x = 15;

    // Table header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(x, y, pageWidth - 30, 7, 'F');
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    tableHeaders.forEach((header, i) => {
      pdf.rect(x + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, colWidths[i], 7);
      pdf.text(header, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + colWidths[i] / 2, y + 4.5, { align: 'center' });
    });
    y += 7;

    // Table rows
    pdf.setFontSize(9);
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
        pdf.rect(cellX, y, colWidths[i], 6);
        const align = i === 0 || i === 3 ? 'center' : i >= 4 ? 'right' : 'left';
        const textX = align === 'center' ? cellX + colWidths[i] / 2 : align === 'right' ? cellX + colWidths[i] - 2 : cellX + 2;
        const maxWidth = colWidths[i] - 4;
        let displayText = cell;
        while (pdf.getTextWidth(displayText) > maxWidth && displayText.length > 3) {
          displayText = displayText.slice(0, -1);
        }
        if (displayText !== cell) displayText += '...';
        pdf.text(displayText, textX, y + 4, { align });
        cellX += colWidths[i];
      });
      y += 6;
    });
    y += 4;

    // Undertaking
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('UNDERTAKING:', 15, y);
    y += 5;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(8);
    const undertaking1 = `We hereby confirm that the product containing the psychotropic substance Buprenorphine, which we intend to procure from Neuroglam, Village Ajnoud, Tehsil Payal, Ludhiana – 141421 (Punjab), is covered under our Purchase Order No. ${poNumber.replace('NH/PO-', '')} dated ${formatDate(poDate)} (${getMonthYear(poDate)}).`;
    const splitUndertaking1 = pdf.splitTextToSize(undertaking1, pageWidth - 30);
    pdf.text(splitUndertaking1, 15, y);
    y += splitUndertaking1.length * 3 + 2;

    const undertaking2 = `The products purchased by us will be exclusively supplied to De-Addiction Centres and qualified Doctors under our valid License No. PSMHC/Punjab/2024/863. We are fully aware that this product contains controlled substances regulated under the Narcotic Drugs and Psychotropic Substances Act, 1985, and we shall maintain all statutory records pertaining to its sale and purchase.`;
    const splitUndertaking2 = pdf.splitTextToSize(undertaking2, pageWidth - 30);
    pdf.text(splitUndertaking2, 15, y);
    y += splitUndertaking2.length * 3 + 2;

    const undertaking3 = `We further assure that an Acknowledgement (Form-6 Consignment Note) for the receipt of the above substance will be issued to the supplier immediately upon delivery.`;
    const splitUndertaking3 = pdf.splitTextToSize(undertaking3, pageWidth - 30);
    pdf.text(splitUndertaking3, 15, y);
    y += splitUndertaking3.length * 3 + 2;

    const undertaking4 = `Additionally, we undertake that the procured product will be used only for the formulations and sales mentioned below and will be marketed within India only. These products are not intended for retail counter sale or export.`;
    const splitUndertaking4 = pdf.splitTextToSize(undertaking4, pageWidth - 30);
    pdf.text(splitUndertaking4, 15, y);
    y += splitUndertaking4.length * 3 + 4;

    // Neuroglam Liability Acknowledgment
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('Neuroglam Liability Acknowledgment', 15, y);
    y += 5;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(8);
    const liability = `We acknowledge that Neuroglam shall not be held liable for any non-compliance with statutory provisions committed by us, whether intentionally or unintentionally.`;
    const splitLiability = pdf.splitTextToSize(liability, pageWidth - 30);
    pdf.text(splitLiability, 15, y);
    y += splitLiability.length * 3 + 5;

    // For section
    pdf.setFontSize(9);
    pdf.text('For Navjeevanhospital, opp. New Bus Stand, G.t. Road, Sirhind', 15, y);
    y += 12;

    // Signature section
    pdf.setFontSize(10);
    pdf.text(`Date: ${formatDate(poDate)}`, 15, y);
    pdf.text('(Navjeevanhospital)', pageWidth / 2, y, { align: 'center' });
    pdf.text(`(${doctorName}.)`, pageWidth - 15, y, { align: 'right' });

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

        <div ref={printRef} className="p-4 bg-white text-black" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11px', lineHeight: '1.3' }}>
          {/* Regd. Govt of Punjab */}
          <p className="text-center text-[11px] font-bold mb-1">Regd. Govt of Punjab</p>

          {/* Hospital Name */}
          <h1 className="text-[20px] font-bold text-center my-1">NAVJEEVAN HOSPITAL</h1>

          {/* Address */}
          <p className="text-center text-[10px] mb-1">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib
          </p>

          {/* Doctor Name */}
          <p className="text-center text-[11px] font-bold mb-1">{doctorName}</p>

          {/* Licence Row */}
          <p className="text-center text-[10px] mb-3">
            Licence No. PSMHC/Pb./2024/863 Dt. 2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[11px] mb-3">
            <span>PO NO: {poNumber}</span>
            <span>DATE: {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[10px] mb-2 leading-snug">
            <p className="mb-1">To,</p>
            <p className="font-bold">Neuroglam</p>
            <p>Address: Village – Ajnoud, Tehsil – Payal</p>
            <p>Ludhiana – 141421 (Punjab)</p>
          </div>

          {/* Subject - centered bold */}
          <p className="text-[11px] font-bold text-center my-2">Sub: Purchase Order</p>

          {/* Salutation */}
          <p className="text-[10px] my-2">Dear Sir, ma&apos;am</p>

          {/* Intro Paragraph */}
          <p className="text-[9px] text-justify mb-2 leading-snug">
            We hereby placing a purchase order with Stamp and Sign of our current working doctor&apos;s. Terms and Conditions will remain same as our discussion on phonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-2 text-[9px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1 text-center">Sr. No.</th>
                <th className="border border-black px-2 py-1 text-center">Product Name</th>
                <th className="border border-black px-2 py-1 text-center">Compositions</th>
                <th className="border border-black px-2 py-1 text-center">Packing</th>
                <th className="border border-black px-2 py-1 text-center">Qty.In Strips</th>
                <th className="border border-black px-2 py-1 text-center">Qty.In Tablets</th>
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
                    <td className="border border-black px-2 py-1 text-center">{index + 1}.</td>
                    <td className="border border-black px-2 py-1">{item.stockItemName}</td>
                    <td className="border border-black px-2 py-1">{stockItem?.composition || '-'}</td>
                    <td className="border border-black px-2 py-1 text-center">{packing}</td>
                    <td className="border border-black px-2 py-1 text-right">{qtyInStrips.toLocaleString()}</td>
                    <td className="border border-black px-2 py-1 text-right">{qtyInTabs.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Undertaking */}
          <p className="font-bold text-[10px] mb-1">UNDERTAKING:</p>
          <p className="text-[8px] text-justify leading-snug mb-1">
            We hereby confirm that the product containing the psychotropic substance Buprenorphine, which we intend to procure from Neuroglam, Village Ajnoud, Tehsil Payal, Ludhiana – 141421 (Punjab), is covered under our Purchase Order No. {poNumber.replace('NH/PO-', '')} dated {formatDate(poDate)} ({getMonthYear(poDate)}).
          </p>
          <p className="text-[8px] text-justify leading-snug mb-1">
            The products purchased by us will be exclusively supplied to De-Addiction Centres and qualified Doctors under our valid License No. PSMHC/Punjab/2024/863. We are fully aware that this product contains controlled substances regulated under the Narcotic Drugs and Psychotropic Substances Act, 1985, and we shall maintain all statutory records pertaining to its sale and purchase.
          </p>
          <p className="text-[8px] text-justify leading-snug mb-1">
            We further assure that an Acknowledgement (Form-6 Consignment Note) for the receipt of the above substance will be issued to the supplier immediately upon delivery.
          </p>
          <p className="text-[8px] text-justify leading-snug mb-2">
            Additionally, we undertake that the procured product will be used only for the formulations and sales mentioned below and will be marketed within India only. These products are not intended for retail counter sale or export.
          </p>

          {/* Neuroglam Liability Acknowledgment */}
          <p className="font-bold text-[10px] mb-1">Neuroglam Liability Acknowledgment</p>
          <p className="text-[8px] text-justify leading-snug mb-3">
            We acknowledge that Neuroglam shall not be held liable for any non-compliance with statutory provisions committed by us, whether intentionally or unintentionally.
          </p>

          {/* For Section */}
          <p className="text-[9px] mb-4">
            For Navjeevanhospital, opp. New Bus Stand, G.t. Road, Sirhind
          </p>

          {/* Signature Section */}
          <div className="flex justify-between items-end mt-8 text-[10px]">
            <div>
              <p>Date: {formatDate(poDate)}</p>
            </div>
            <div className="text-center">
              <p>(Navjeevanhospital)</p>
            </div>
            <div className="text-right">
              <p>({doctorName}.)</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
