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
            body { font-family: 'Times New Roman', Times, serif; padding: 20px 25px; font-size: 14px; line-height: 1.5; }
            .header-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
            .hospital-name { font-size: 26px; font-weight: bold; text-align: center; margin: 10px 0; }
            .address-row { text-align: center; font-size: 13px; margin-bottom: 5px; }
            .licence-row { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 12px; }
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 14px; font-weight: bold; }
            .to-section { margin-bottom: 10px; font-size: 13px; line-height: 1.6; }
            .sub-line { font-size: 16px; font-weight: bold; margin: 10px 0; }
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
            .signature-section { display: flex; justify-content: space-between; margin-top: 12px; font-size: 13px; }
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

    // Header row - Regd and Mob on same line
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    pdf.text('Regd. Govt of Punjab', leftMargin, y);
    pdf.text('Mob: 6284942412', pageWidth - leftMargin, y, { align: 'right' });
    y += 12;

    // Hospital Name (centered) - bold and larger
    pdf.setFontSize(24);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Address
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib', pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Doctor name
    pdf.text('Dr. metali Bhatti', pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Licence - bold
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text('Licence No. PSMHC/Pb./2024/863 Dt. 2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // PO Number and Date - bold
    pdf.setFontSize(13);
    pdf.setFont('times', 'bold');
    pdf.text(`PO NO- NH-25-26 - ${getPONumberSuffix()}`, leftMargin, y);
    pdf.text(`DATE - ${formatDate(poDate)}`, pageWidth - leftMargin, y, { align: 'right' });
    y += 12;

    // To Section
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    pdf.text('To,', leftMargin, y);
    y += 6;
    pdf.setFont('times', 'bold');
    pdf.text('Rusan Pharma Ltd.', leftMargin, y);
    y += 6;
    pdf.setFont('times', 'normal');
    pdf.text('Khasra No. 122MI, Central Hope Town,', leftMargin, y);
    y += 6;
    pdf.text('Selaqui, Dehradun, Uttarakhand-248197', leftMargin, y);
    y += 10;

    // Sub line - bold and larger
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.text('Sub: Purchase Order', leftMargin, y);
    y += 10;

    // Salutation
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    pdf.text("Dear Sir, ma'am", leftMargin, y);
    y += 8;

    // Intro paragraph
    pdf.setFontSize(12);
    const introText = "We hereby placing a purchase order with Stamp and Sign of our current working doctor's. Terms and Conditions will remain same as our discussion on phonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.";
    const splitIntro = pdf.splitTextToSize(introText, pageWidth - 30);
    pdf.text(splitIntro, leftMargin, y);
    y += splitIntro.length * 6 + 8;

    // Table
    const tableHeaders = ['Sr. No.', 'Product Name', 'Compositions', 'Packing', 'Qty.In Strips', 'Qty.In Tablets'];
    const colWidths = [15, 35, 55, 20, 25, 30];
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
        pdf.rect(cellX, y, colWidths[i], 8);
        const align = i === 0 || i === 3 ? 'center' : i >= 4 ? 'right' : 'left';
        const textX = align === 'center' ? cellX + colWidths[i] / 2 : align === 'right' ? cellX + colWidths[i] - 2 : cellX + 2;
        pdf.text(cell, textX, y + 5.5, { align });
        cellX += colWidths[i];
      });
      y += 8;
    });
    y += 10;

    // Undertaking
    pdf.setFont('times', 'bold');
    pdf.setFontSize(12);
    pdf.text('UNDERTAKING:', leftMargin, y);
    y += 7;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(11);
    const undertakingText = `We hereby confirm that the product which we intend to buy from RUSAN PHARMA LTD. KHASRA NO. 122MI, CENTRAL HOPE TOWN, SELAQUI, DEHRADUN, UTTARAKHAND. 248197 Our P O. No: ${getPONumberSuffix()}/A (${getMonthYear(poDate)}) : date ${formatDate(poDate)}. These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our License No. PSMHC/Punjab/2024/863 we are fully aware These product containing controlled substances as per Narcotic Drugs & Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6 (Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation & for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any non-compliance of statutory provisions committed by us intentionally or unintentionally.`;
    const splitUndertaking = pdf.splitTextToSize(undertakingText, pageWidth - 30);
    pdf.text(splitUndertaking, leftMargin, y);
    y += splitUndertaking.length * 5 + 10;

    // For line
    pdf.setFontSize(12);
    pdf.text('For Navjeevan hospital, opp. New Bus Stand, G.t. Road, Sirhind', leftMargin, y);
    y += 10;

    // Date
    pdf.setFontSize(12);
    pdf.text(`Date: ${formatDate(poDate)}`, leftMargin, y);
    y += 25; // Space for stamp and signature

    // Signature section
    pdf.setFontSize(12);
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

        <div ref={printRef} className="p-6 bg-white text-black" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '14px', lineHeight: '1.6' }}>
          {/* Header Row - Regd and Mob on same line */}
          <div className="flex justify-between text-[13px] mb-3">
            <span>Regd. Govt of Punjab</span>
            <span>Mob: 6284942412</span>
          </div>

          {/* Hospital Name */}
          <h1 className="text-2xl font-bold text-center my-3">NAVJEEVAN HOSPITAL</h1>

          {/* Address Row */}
          <p className="text-center text-[13px] mb-1">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib
          </p>

          {/* Doctor Name */}
          <p className="text-center text-[13px] mb-1">
            Dr. metali Bhatti
          </p>

          {/* Licence Row */}
          <p className="text-center text-[12px] font-bold mb-4">
            Licence No. PSMHC/Pb./2024/863 Dt. 2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[14px] mb-5">
            <span>PO NO- NH-25-26 - {getPONumberSuffix()}</span>
            <span>DATE - {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[13px] mb-3 leading-relaxed">
            <p className="mb-1">To,</p>
            <p className="font-bold">Rusan Pharma Ltd.</p>
            <p>Khasra No. 122MI, Central Hope Town,</p>
            <p>Selaqui, Dehradun, Uttarakhand-248197</p>
          </div>

          {/* Sub line */}
          <p className="font-bold text-[16px] my-4">Sub: Purchase Order</p>

          {/* Salutation */}
          <p className="text-[13px] my-3">Dear Sir, ma&apos;am</p>

          {/* Intro Paragraph */}
          <p className="text-[13px] text-justify mb-4 leading-relaxed">
            We hereby placing a purchase order with Stamp and Sign of our current working doctor&apos;s. Terms and Conditions will remain same as our discussion on phonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse my-4 text-[13px]">
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
                const packing = stockItem?.packing || "10*10";
                const packingMatch = packing.match(/(\d+)\*(\d+)/);
                const tabletsPerStrip = packingMatch ? parseInt(packingMatch[1]) * parseInt(packingMatch[2]) : 10;
                const qtyInTablets = item.quantity * tabletsPerStrip;
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-2 py-2 text-center">{index + 1}.</td>
                    <td className="border border-black px-2 py-2">{item.stockItemName}</td>
                    <td className="border border-black px-2 py-2">{stockItem?.composition || '-'}</td>
                    <td className="border border-black px-2 py-2 text-center">{packing}</td>
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
            We hereby confirm that the product which we intend to buy from RUSAN PHARMA LTD. KHASRA NO. 122MI, CENTRAL HOPE TOWN, SELAQUI, DEHRADUN, UTTARAKHAND. 248197 Our P O. No: {getPONumberSuffix()}/A ({getMonthYear(poDate)}) : date {formatDate(poDate)}. These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our License No. PSMHC/Punjab/2024/863 we are fully aware These product containing controlled substances as per Narcotic Drugs &amp; Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6 (Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation &amp; for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any non-compliance of statutory provisions committed by us intentionally or unintentionally.
          </p>

          <p className="text-[13px] mb-3">
            For Navjeevan hospital, opp. New Bus Stand, G.t. Road, Sirhind
          </p>

          <p className="text-[13px] mb-3">
            Date: {formatDate(poDate)}
          </p>

          {/* Space for stamp and signature */}
          <div className="h-20 my-5">
            {/* Space for stamp and signature */}
          </div>

          {/* Signature Section */}
          <div className="flex justify-around items-end text-[13px]">
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
