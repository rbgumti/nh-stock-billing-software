import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import jsPDF from "jspdf";

interface NeuroglamPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function NeuroglamPO({ poNumber, poDate, items, stockItems, onClose }: NeuroglamPOProps) {
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
            body { font-family: 'Times New Roman', Times, serif; padding: 15px 25px; font-size: 14px; line-height: 1.5; }
            .header-row { text-align: center; font-size: 14px; margin-bottom: 6px; }
            .header-section { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
            .logo { width: 32px; height: 32px; object-fit: contain; }
            .hospital-name { font-size: 26px; font-weight: bold; flex: 1; text-align: center; }
            .address-row { text-align: center; font-size: 14px; margin-bottom: 4px; }
            .licence-row { text-align: center; font-size: 13px; margin-bottom: 12px; }
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; font-weight: bold; }
            .to-section { margin-bottom: 10px; font-size: 14px; line-height: 1.5; }
            .salutation { margin: 8px 0 6px 0; font-size: 14px; }
            .intro-para { font-size: 14px; text-align: justify; margin-bottom: 10px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
            th, td { border: 1px solid #000; padding: 6px 8px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .undertaking-title { font-weight: bold; font-size: 14px; margin: 12px 0 6px 0; }
            .undertaking-text { font-size: 12px; text-align: justify; line-height: 1.4; margin-bottom: 12px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 16px; font-size: 14px; }
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
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib    Dr.Metali Bhatti', pageWidth / 2, y, { align: 'center' });
    y += 7;

    // Licence - bold
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text('Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // PO Number and Date - bold
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.text(`PO NO: ${poNumber}`, 10, y);
    pdf.text(`DATE: ${formatDate(poDate)}`, pageWidth - 10, y, { align: 'right' });
    y += 10;

    // To Section
    pdf.setFontSize(13);
    pdf.setFont('times', 'normal');
    pdf.text('To,', 10, y);
    y += 6;
    pdf.setFont('times', 'bold');
    pdf.text('Neuroglam', 10, y);
    y += 6;
    pdf.setFont('times', 'normal');
    pdf.text('Address: Village – Ajnoud, Tehsil – Payal', 10, y);
    y += 6;
    pdf.text('Ludhiana – 141421 (Punjab)', 10, y);
    y += 8;

    pdf.text('Sub : Purchase Order', 10, y);
    y += 7;
    pdf.text("Dear Sir, ma'am", 10, y);
    y += 8;

    // Intro paragraph
    pdf.setFontSize(12);
    const introText = "We hereby placing a purchase order with Stamp and Sign of our current working doctor's. Terms and Conditions will remain same as our discussion on phonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.";
    const splitIntro = pdf.splitTextToSize(introText, pageWidth - 20);
    pdf.text(splitIntro, 10, y);
    y += splitIntro.length * 5 + 4;

    // Table
    const tableHeaders = ['Sr. No.', 'Product Name', 'Compositions', 'Packing', 'Qty.In Strips', 'Qty.In Tablets'];
    const colWidths = [14, 48, 48, 22, 28, 28];
    let x = 10;

    // Table header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(x, y, pageWidth - 20, 9, 'F');
    pdf.setFontSize(10);
    pdf.setFont('times', 'bold');
    tableHeaders.forEach((header, i) => {
      pdf.text(header, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + colWidths[i] / 2, y + 6, { align: 'center' });
    });
    pdf.rect(x, y, pageWidth - 20, 9);
    y += 9;

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
    y += 6;

    // Undertaking
    pdf.setFont('times', 'bold');
    pdf.setFontSize(13);
    pdf.text('UNDERTAKING:-', 10, y);
    y += 7;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(10);
    const undertaking1 = `We hereby confirm that the product containing psychotropics Substance (Buprenorphine), which we intend to buy from Neuroglam, Village-Ajnoud,Tehsil-Payal,Ludhiana-141421 (Punjab) Our P O. No:${poNumber} ${getMonthYear(poDate)} :date ${formatDate(poDate)}.`;
    const splitUndertaking1 = pdf.splitTextToSize(undertaking1, pageWidth - 20);
    pdf.text(splitUndertaking1, 10, y);
    y += splitUndertaking1.length * 4 + 3;

    const undertaking2 = `These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our License No.PSMHC/Punjab/2024/863 we are fully aware These product containing controlled substances as per Narcotic Drugs & Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6(Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation & for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any on-compliance of statutory provisions committed by us intentionally or un-intentionally`;
    const splitUndertaking2 = pdf.splitTextToSize(undertaking2, pageWidth - 20);
    pdf.text(splitUndertaking2, 10, y);
    y += splitUndertaking2.length * 4 + 6;

    pdf.setFontSize(13);
    pdf.text('For Navjeevanhospital,opp.New Bus Stand,G.t. Road, Sirhind', 10, y);
    y += 12;

    // Signature section
    pdf.text(`Date: ${formatDate(poDate)}`, 10, y);
    pdf.text('(Navjeevanhospital)', pageWidth / 2, y, { align: 'center' });
    pdf.text('(Dr.Metali Bhatti.)', pageWidth - 10, y, { align: 'right' });

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

        <div ref={printRef} className="p-6 bg-white text-black" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '14px', lineHeight: '1.5' }}>
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
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;Dr.Metali Bhatti
          </p>

          {/* Licence Row */}
          <p className="text-center text-[13px] font-bold mb-5">
            Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[16px] mb-5">
            <span>PO NO: {poNumber}</span>
            <span>DATE: {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[14px] mb-4 leading-relaxed">
            <p className="mb-2">To,</p>
            <p className="font-bold">Neuroglam</p>
            <p>Address: Village – Ajnoud, Tehsil – Payal</p>
            <p>Ludhiana – 141421 (Punjab)</p>
          </div>

          {/* Subject */}
          <p className="text-[14px] mb-2">Sub : Purchase Order</p>

          {/* Salutation */}
          <p className="text-[14px] my-4">Dear Sir, ma&apos;am</p>

          {/* Intro Paragraph */}
          <p className="text-[14px] text-justify mb-4 leading-relaxed">
            We hereby placing a purchase order with Stamp and Sign of our current working doctor&apos;s. Terms and Conditions will remain same asour discussion on phonically, payment of product shall be done through cheque to yourBank account, the name and composition of product is given below, please do the supply earlier as possible.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4 text-[13px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-3 py-2 text-center">Sr. No.</th>
                <th className="border border-black px-3 py-2 text-center">Product Name</th>
                <th className="border border-black px-3 py-2 text-center">Compositions</th>
                <th className="border border-black px-3 py-2 text-center">Packing</th>
                <th className="border border-black px-3 py-2 text-center">Qty.In Strips</th>
                <th className="border border-black px-3 py-2 text-center">Qty.In Tablets</th>
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
                    <td className="border border-black px-3 py-2 text-center">{index + 1}.</td>
                    <td className="border border-black px-3 py-2">{item.stockItemName}</td>
                    <td className="border border-black px-3 py-2">{stockItem?.composition || '-'}</td>
                    <td className="border border-black px-3 py-2 text-center">{packing}</td>
                    <td className="border border-black px-3 py-2 text-right">{item.quantity.toLocaleString()}</td>
                    <td className="border border-black px-3 py-2 text-right">{qtyInTablets.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Undertaking */}
          <p className="font-bold text-[14px] mb-3">UNDERTAKING:-</p>
          <p className="text-[12px] text-justify leading-relaxed mb-2">
            We hereby confirm that the productcontaining psychotropics Substance (Buprenorphine), which we intend to buy from Neuroglam, Village-Ajnoud,Tehsil-Payal,Ludhiana-141421 (Punjab) Our P O. No:{poNumber} {getMonthYear(poDate)} :date {formatDate(poDate)}.
          </p>
          <p className="text-[12px] text-justify leading-relaxed mb-5">
            These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our License No.PSMHC/Punjab/2024/863 we are fully aware These product containing controlled substances as per Narcotic Drugs &amp; Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6(Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation &amp; for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any on-compliance of statutory provisions committed by us intentionally or un-intentionally
          </p>

          <p className="text-[14px] mb-5">
            For Navjeevanhospital,opp.New Bus Stand,G.t. Road, Sirhind
          </p>

          {/* Signature Section */}
          <div className="flex justify-between items-end mt-6 text-[14px]">
            <div>
              <p>Date: {formatDate(poDate)}</p>
            </div>
            <div className="text-center">
              <p>(Navjeevanhospital)</p>
            </div>
            <div className="text-right">
              <p>(Dr.Metali Bhatti.)</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
