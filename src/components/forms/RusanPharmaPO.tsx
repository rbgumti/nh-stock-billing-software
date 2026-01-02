import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
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
            body { font-family: 'Times New Roman', Times, serif; padding: 15px 20px; font-size: 12px; line-height: 1.4; }
            .header-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; }
            .hospital-name { font-size: 20px; font-weight: bold; text-align: center; margin: 8px 0; }
            .address-row { text-align: center; font-size: 11px; margin-bottom: 4px; }
            .licence-row { text-align: center; font-size: 10px; font-weight: bold; margin-bottom: 10px; }
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; font-weight: bold; }
            .to-section { margin-bottom: 8px; font-size: 11px; line-height: 1.5; }
            .sub-line { font-size: 14px; font-weight: bold; margin: 8px 0; }
            .salutation { margin: 8px 0; font-size: 11px; }
            .intro-para { font-size: 11px; text-align: justify; margin-bottom: 10px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
            th, td { border: 1px solid #000; padding: 6px 8px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .undertaking-title { font-weight: bold; font-size: 12px; margin: 12px 0 6px 0; text-decoration: underline; }
            .undertaking-text { font-size: 10px; text-align: justify; line-height: 1.4; margin-bottom: 12px; }
            .for-line { font-size: 11px; margin: 15px 0 30px 0; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 10px; font-size: 11px; }
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
    let y = 15;

    // Header row - Regd and Mob on same line
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.text('Regd. Govt of Punjab', leftMargin, y);
    pdf.text('Mob: 6284942412', pageWidth - leftMargin, y, { align: 'right' });
    y += 10;

    // Hospital Name (centered) - bold and larger
    pdf.setFontSize(18);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Address
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib', pageWidth / 2, y, { align: 'center' });
    y += 5;

    // Doctor name
    pdf.text('Dr. metali Bhatti', pageWidth / 2, y, { align: 'center' });
    y += 5;

    // Licence - bold
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    pdf.text('Licence No. PSMHC/Pb./2024/863 Dt. 2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // PO Number and Date - bold
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text(`PO NO- NH-25-26 - ${getPONumberSuffix()}`, leftMargin, y);
    pdf.text(`DATE - ${formatDate(poDate)}`, pageWidth - leftMargin, y, { align: 'right' });
    y += 10;

    // To Section
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.text('To,', leftMargin, y);
    y += 5;
    pdf.setFont('times', 'bold');
    pdf.text('Rusan Pharma Ltd.', leftMargin, y);
    y += 5;
    pdf.setFont('times', 'normal');
    pdf.text('Khasra No. 122MI, Central Hope Town,', leftMargin, y);
    y += 5;
    pdf.text('Selaqui, Dehradun, Uttarakhand-248197', leftMargin, y);
    y += 8;

    // Sub line - bold and larger
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text('Sub: Purchase Order', leftMargin, y);
    y += 8;

    // Salutation
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.text("Dear Sir, ma'am", leftMargin, y);
    y += 7;

    // Intro paragraph
    const introText = "We hereby placing a purchase order with Stamp and Sign of our current working doctor's. Terms and Conditions will remain same as our discussion on phonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.";
    const splitIntro = pdf.splitTextToSize(introText, pageWidth - 30);
    pdf.text(splitIntro, leftMargin, y);
    y += splitIntro.length * 5 + 5;

    // Table
    const tableHeaders = ['Sr. No.', 'Product Name', 'Compositions', 'Packing', 'Qty.In Strips', 'Qty.In Tablets'];
    const colWidths = [15, 35, 55, 20, 25, 30];
    let x = leftMargin;

    // Table header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(x, y, pageWidth - 30, 7, 'F');
    pdf.setFontSize(9);
    pdf.setFont('times', 'bold');
    tableHeaders.forEach((header, i) => {
      pdf.rect(x + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, colWidths[i], 7);
      pdf.text(header, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + colWidths[i] / 2, y + 5, { align: 'center' });
    });
    y += 7;

    // Table rows
    pdf.setFont('times', 'normal');
    items.forEach((item, index) => {
      const stockItem = getStockItemDetails(item.stockItemId);
      const packing = stockItem?.packing || "10*10";
      const packingMatch = packing.match(/(\d+)\*(\d+)/);
      const tabletsPerStrip = packingMatch ? parseInt(packingMatch[1]) * parseInt(packingMatch[2]) : 10;
      const qtyInTablets = item.quantity * tabletsPerStrip;

      const rowData = [
        `${index + 1}.`,
        item.stockItemName,
        stockItem?.composition || '-',
        packing,
        item.quantity.toLocaleString(),
        qtyInTablets.toLocaleString()
      ];

      let cellX = x;
      rowData.forEach((cell, i) => {
        pdf.rect(cellX, y, colWidths[i], 7);
        const align = i === 0 || i === 3 ? 'center' : i >= 4 ? 'right' : 'left';
        const textX = align === 'center' ? cellX + colWidths[i] / 2 : align === 'right' ? cellX + colWidths[i] - 2 : cellX + 2;
        pdf.text(cell, textX, y + 5, { align });
        cellX += colWidths[i];
      });
      y += 7;
    });
    y += 8;

    // Undertaking
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('UNDERTAKING:', leftMargin, y);
    y += 6;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(9);
    const undertakingText = `We hereby confirm that the product which we intend to buy from RUSAN PHARMA LTD. KHASRA NO. 122MI, CENTRAL HOPE TOWN, SELAQUI, DEHRADUN, UTTARAKHAND. 248197 Our P O. No: ${getPONumberSuffix()}/A (${getMonthYear(poDate)}) : date ${formatDate(poDate)}. These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our License No. PSMHC/Punjab/2024/863 we are fully aware These product containing controlled substances as per Narcotic Drugs & Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6 (Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation & for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any non-compliance of statutory provisions committed by us intentionally or unintentionally.`;
    const splitUndertaking = pdf.splitTextToSize(undertakingText, pageWidth - 30);
    pdf.text(splitUndertaking, leftMargin, y);
    y += splitUndertaking.length * 4 + 8;

    // For line
    pdf.setFontSize(10);
    pdf.text('For Navjeevan hospital, opp. New Bus Stand, G.t. Road, Sirhind', leftMargin, y);
    y += 8;

    // Date
    pdf.text(`Date: ${formatDate(poDate)}`, leftMargin, y);
    y += 20; // Space for stamp and signature

    // Signature section
    pdf.text('(Navjeevan hospital)', pageWidth / 3, y, { align: 'center' });
    pdf.text('(Dr. metali Bhatti)', (pageWidth * 2) / 3, y, { align: 'center' });

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

        <div ref={printRef} className="p-6 bg-white text-black" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '12px', lineHeight: '1.5' }}>
          {/* Header Row - Regd and Mob on same line */}
          <div className="flex justify-between text-[11px] mb-2">
            <span>Regd. Govt of Punjab</span>
            <span>Mob: 6284942412</span>
          </div>

          {/* Hospital Name */}
          <h1 className="text-xl font-bold text-center my-2">NAVJEEVAN HOSPITAL</h1>

          {/* Address Row */}
          <p className="text-center text-[11px] mb-1">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib
          </p>

          {/* Doctor Name */}
          <p className="text-center text-[11px] mb-1">
            Dr. metali Bhatti
          </p>

          {/* Licence Row */}
          <p className="text-center text-[10px] font-bold mb-3">
            Licence No. PSMHC/Pb./2024/863 Dt. 2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[12px] mb-4">
            <span>PO NO- NH-25-26 - {getPONumberSuffix()}</span>
            <span>DATE - {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[11px] mb-2 leading-relaxed">
            <p className="mb-1">To,</p>
            <p className="font-bold">Rusan Pharma Ltd.</p>
            <p>Khasra No. 122MI, Central Hope Town,</p>
            <p>Selaqui, Dehradun, Uttarakhand-248197</p>
          </div>

          {/* Sub line */}
          <p className="font-bold text-[14px] my-3">Sub: Purchase Order</p>

          {/* Salutation */}
          <p className="text-[11px] my-2">Dear Sir, ma&apos;am</p>

          {/* Intro Paragraph */}
          <p className="text-[11px] text-justify mb-3 leading-relaxed">
            We hereby placing a purchase order with Stamp and Sign of our current working doctor&apos;s. Terms and Conditions will remain same as our discussion on phonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse my-3 text-[11px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1.5 text-center">Sr. No.</th>
                <th className="border border-black px-2 py-1.5 text-center">Product Name</th>
                <th className="border border-black px-2 py-1.5 text-center">Compositions</th>
                <th className="border border-black px-2 py-1.5 text-center">Packing</th>
                <th className="border border-black px-2 py-1.5 text-center">Qty.In Strips</th>
                <th className="border border-black px-2 py-1.5 text-center">Qty.In Tablets</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10*10";
                const packingMatch = packing.match(/(\d+)\*(\d+)/);
                const tabletsPerStrip = packingMatch ? parseInt(packingMatch[1]) * parseInt(packingMatch[2]) : 10;
                const qtyInTablets = item.quantity * tabletsPerStrip;
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-2 py-1.5 text-center">{index + 1}.</td>
                    <td className="border border-black px-2 py-1.5">{item.stockItemName}</td>
                    <td className="border border-black px-2 py-1.5">{stockItem?.composition || '-'}</td>
                    <td className="border border-black px-2 py-1.5 text-center">{packing}</td>
                    <td className="border border-black px-2 py-1.5 text-right">{item.quantity.toLocaleString()}</td>
                    <td className="border border-black px-2 py-1.5 text-right">{qtyInTablets.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Undertaking */}
          <p className="font-bold text-[12px] mb-2 underline">UNDERTAKING:</p>
          <p className="text-[10px] text-justify leading-snug mb-4">
            We hereby confirm that the product which we intend to buy from RUSAN PHARMA LTD. KHASRA NO. 122MI, CENTRAL HOPE TOWN, SELAQUI, DEHRADUN, UTTARAKHAND. 248197 Our P O. No: {getPONumberSuffix()}/A ({getMonthYear(poDate)}) : date {formatDate(poDate)}. These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our License No. PSMHC/Punjab/2024/863 we are fully aware These product containing controlled substances as per Narcotic Drugs &amp; Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6 (Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation &amp; for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any non-compliance of statutory provisions committed by us intentionally or unintentionally.
          </p>

          <p className="text-[11px] mb-2">
            For Navjeevan hospital, opp. New Bus Stand, G.t. Road, Sirhind
          </p>

          <p className="text-[11px] mb-2">
            Date: {formatDate(poDate)}
          </p>

          {/* Space for stamp and signature */}
          <div className="h-16 my-4">
            {/* Space for stamp and signature */}
          </div>

          {/* Signature Section */}
          <div className="flex justify-around items-end text-[11px]">
            <div className="text-center">
              <p>(Navjeevan hospital)</p>
            </div>
            <div className="text-center">
              <p>(Dr. metali Bhatti)</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
