import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import jsPDF from "jspdf";

interface ParbPharmaPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function ParbPharmaPO({ poNumber, poDate, items, stockItems, onClose }: ParbPharmaPOProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' }).replace(/\//g, '-');
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
            .hospital-name { font-size: 26px; font-weight: bold; text-align: center; margin: 8px 0; }
            .address-row { text-align: center; font-size: 14px; margin-bottom: 4px; }
            .licence-row { text-align: center; font-size: 13px; margin-bottom: 12px; }
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; font-weight: bold; }
            .to-section { margin-bottom: 10px; font-size: 14px; line-height: 1.5; }
            .subject { font-weight: bold; text-decoration: underline; margin: 10px 0; }
            .salutation { margin: 8px 0 6px 0; font-size: 14px; }
            .intro-para { font-size: 14px; text-align: justify; margin-bottom: 10px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
            th, td { border: 1px solid #000; padding: 6px 8px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .undertaking-title { font-weight: bold; font-size: 14px; margin: 12px 0 6px 0; text-decoration: underline; }
            .undertaking-text { font-size: 12px; text-align: justify; line-height: 1.4; margin-bottom: 12px; }
            .signature-section { margin-top: 20px; font-size: 14px; }
            .signature-line { border-bottom: 1px solid #000; width: 200px; margin: 30px 0 5px 0; }
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
    let y = 15;

    // Header - Regd. Govt of Punjab
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    pdf.text('Regd. Govt of Punjab', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Hospital Name (centered) - bold
    pdf.setFontSize(24);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Address
    pdf.setFontSize(11);
    pdf.setFont('times', 'normal');
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib,', pageWidth / 2, y, { align: 'center' });
    y += 5;

    // Mobile
    pdf.text('Mob: 6284942412', pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Licence
    pdf.setFontSize(11);
    pdf.text('Licence No.: PSMHC/Pb./2024/863 | Dt. 2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // PO Number and Date
    pdf.setFontSize(12);
    pdf.setFont('times', 'bold');
    pdf.text(`PO No.: ${poNumber}`, 15, y);
    pdf.text(`Date: ${formatDate(poDate)}`, pageWidth - 15, y, { align: 'right' });
    y += 10;

    // To Section
    pdf.setFontSize(12);
    pdf.setFont('times', 'normal');
    pdf.text('To,', 15, y);
    y += 5;
    pdf.setFont('times', 'bold');
    pdf.text('PARB PHARMACEUTICALS PVT. LTD.', 15, y);
    y += 5;
    pdf.setFont('times', 'normal');
    pdf.text('E-9, INDUSTRIAL AREA SIIDCUL, SILAQULI', 15, y);
    y += 5;
    pdf.text('DEHRADUN UTTARAKHAND', 15, y);
    y += 10;

    // Subject - underlined
    pdf.setFont('times', 'bold');
    pdf.text('Subject: Purchase Order', 15, y);
    pdf.line(15, y + 1, 15 + pdf.getTextWidth('Subject: Purchase Order'), y + 1);
    y += 8;

    // Salutation
    pdf.setFont('times', 'normal');
    pdf.text('Dear Sir/Madam,', 15, y);
    y += 8;

    // Intro paragraph
    pdf.setFontSize(11);
    const introText = "We hereby placing a purchase order, Terms and Conditions will remain same as Our discussion telephonically. Payment of product shall be done through cheque to your bank account. The name and composition of product give below, please supply as early as possible:";
    const splitIntro = pdf.splitTextToSize(introText, pageWidth - 30);
    pdf.text(splitIntro, 15, y);
    y += splitIntro.length * 5 + 6;

    // Table
    const tableHeaders = ['Sr.', 'Product', 'Compositions', 'Pack', 'Strips', 'Tablets'];
    const colWidths = [12, 35, 65, 20, 25, 25];
    let x = 15;

    // Table header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(x, y, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
    pdf.setFontSize(10);
    pdf.setFont('times', 'bold');
    tableHeaders.forEach((header, i) => {
      pdf.rect(x + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, colWidths[i], 8);
      pdf.text(header, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + colWidths[i] / 2, y + 5.5, { align: 'center' });
    });
    y += 8;

    // Table rows
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    items.forEach((item, index) => {
      const stockItem = getStockItemDetails(item.stockItemId);
      const packing = item.packSize || stockItem?.packing || "10×10";
      const qtyInStrips = item.qtyInStrips || item.quantity;
      const qtyInTabs = item.qtyInTabs || (qtyInStrips * 10);

      const rowData = [
        `${index + 1}`,
        item.stockItemName,
        stockItem?.composition || '-',
        packing,
        qtyInStrips.toLocaleString(),
        qtyInTabs.toLocaleString()
      ];

      let cellX = x;
      const rowHeight = 8;
      rowData.forEach((cell, i) => {
        pdf.rect(cellX, y, colWidths[i], rowHeight);
        const align = i === 0 || i >= 3 ? 'center' : 'left';
        const textX = align === 'center' ? cellX + colWidths[i] / 2 : cellX + 2;
        
        // Handle long text wrapping for composition
        if (i === 2 && cell.length > 35) {
          const splitText = pdf.splitTextToSize(cell, colWidths[i] - 4);
          pdf.text(splitText[0].substring(0, 35) + (splitText.length > 1 ? '...' : ''), textX, y + 5.5, { align });
        } else {
          pdf.text(cell, textX, y + 5.5, { align });
        }
        cellX += colWidths[i];
      });
      y += rowHeight;
    });
    y += 8;

    // Undertaking
    pdf.setFont('times', 'bold');
    pdf.setFontSize(12);
    pdf.text('UNDERTAKING:', 15, y);
    pdf.line(15, y + 1, 15 + pdf.getTextWidth('UNDERTAKING:'), y + 1);
    y += 7;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(10);
    const undertakingText = `We hereby confirm that the products which we intend to buy from PARA PHARMACEUTICALS PVT. LTD. E-9, INDUSTRIAL AREA SIIDCUL, SILAQUI DEHRADUN UTTARAKHAND INDIA Our P.O.NO ${poNumber}. .dt- ${formatDate(poDate)}. These products purchased by us will be exclusively sold by psychiatric clinic and hospital in addition to the designated de-addiction centers and hospital with de addiction facilities only, on our License no PSMHC/Pb./2024/863. We are full aware these products containing controlled substance as per Narcotic drugs & psychotropic substance Act 1985, and we will keep the relevant records of sale and purchase to us. Also we assure our acknowledgement in form 6(consignment note) for receipt of above purchase item to supplier immediately on receipt of above controlled substances. Further we undertake that we are taking the products for sale of below mentioned formulation & for its sale within india only & not meant for export.`;
    const splitUndertaking = pdf.splitTextToSize(undertakingText, pageWidth - 30);
    pdf.text(splitUndertaking, 15, y);
    y += splitUndertaking.length * 4 + 10;

    // Signature section
    pdf.setFontSize(11);
    pdf.text('For Navjeevan Hospital,', 15, y);
    y += 5;
    pdf.text('Opp. New Bus Stand, G.T. Road, Sirhind', 15, y);
    y += 15;

    // Signature line
    pdf.line(15, y, 65, y);
    y += 5;
    pdf.text('Dr. Metali Bhatti', 15, y);
    pdf.text(`Date: ${formatDate(poDate)}`, 55, y);

    pdf.save(`PO-${poNumber}-Parb-Pharma.pdf`);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Parb Pharma Purchase Order Format</span>
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
          {/* Header - Regd. Govt of Punjab */}
          <p className="text-center text-[12px] mb-2">Regd. Govt of Punjab</p>

          {/* Hospital Name */}
          <h1 className="text-[26px] font-bold text-center mb-2">NAVJEEVAN HOSPITAL</h1>

          {/* Address Row */}
          <p className="text-center text-[12px] mb-1">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib,
          </p>

          {/* Mobile */}
          <p className="text-center text-[12px] mb-2">
            Mob: 6284942412
          </p>

          {/* Licence Row */}
          <p className="text-center text-[11px] mb-4">
            Licence No.: PSMHC/Pb./2024/863 | Dt. 2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[14px] mb-4">
            <span>PO No.: {poNumber}</span>
            <span>Date: {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[12px] mb-4 leading-relaxed">
            <p className="mb-1">To,</p>
            <p className="font-bold">PARB PHARMACEUTICALS PVT. LTD.</p>
            <p>E-9, INDUSTRIAL AREA SIIDCUL, SILAQULI</p>
            <p>DEHRADUN UTTARAKHAND</p>
          </div>

          {/* Subject */}
          <p className="text-[13px] mb-3 font-bold">
            <span className="underline">Subject: Purchase Order</span>
          </p>

          {/* Salutation */}
          <p className="text-[12px] mb-3">Dear Sir/Madam,</p>

          {/* Intro Paragraph */}
          <p className="text-[12px] text-justify mb-4 leading-relaxed">
            We hereby placing a purchase order, Terms and Conditions will remain same as Our discussion telephonically. Payment of product shall be done through cheque to your bank account. The name and composition of product give below, please supply as early as possible:
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4 text-[12px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-2 text-center w-[8%]">Sr.</th>
                <th className="border border-black px-2 py-2 text-center w-[20%]">Product</th>
                <th className="border border-black px-2 py-2 text-center w-[36%]">Compositions</th>
                <th className="border border-black px-2 py-2 text-center w-[12%]">Pack</th>
                <th className="border border-black px-2 py-2 text-center w-[12%]">Strips</th>
                <th className="border border-black px-2 py-2 text-center w-[12%]">Tablets</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = item.packSize || stockItem?.packing || "10×10";
                const qtyInStrips = item.qtyInStrips || item.quantity;
                const qtyInTabs = item.qtyInTabs || (qtyInStrips * 10);
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-black px-2 py-2">{item.stockItemName}</td>
                    <td className="border border-black px-2 py-2">{stockItem?.composition || '-'}</td>
                    <td className="border border-black px-2 py-2 text-center">{packing}</td>
                    <td className="border border-black px-2 py-2 text-center">{qtyInStrips.toLocaleString()}</td>
                    <td className="border border-black px-2 py-2 text-center">{qtyInTabs.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Undertaking */}
          <p className="font-bold text-[13px] mb-2">
            <span className="underline">UNDERTAKING:</span>
          </p>
          <p className="text-[11px] text-justify leading-relaxed mb-5">
            We hereby confirm that the products which we intend to buy from PARA PHARMACEUTICALS PVT. LTD. E-9, INDUSTRIAL AREA SIIDCUL, SILAQUI DEHRADUN UTTARAKHAND INDIA Our P.O.NO {poNumber}. .dt- {formatDate(poDate)}. These products purchased by us will be exclusively sold by psychiatric clinic and hospital in addition to the designated de-addiction centers and hospital with de addiction facilities only, on our License no PSMHC/Pb./2024/863. We are full aware these products containing controlled substance as per Narcotic drugs &amp; psychotropic substance Act 1985, and we will keep the relevant records of sale and purchase to us. Also we assure our acknowledgement in form 6(consignment note) for receipt of above purchase item to supplier immediately on receipt of above controlled substances. Further we undertake that we are taking the products for sale of below mentioned formulation &amp; for its sale within india only &amp; not meant for export.
          </p>

          {/* Signature Section */}
          <div className="text-[12px] mt-6">
            <p>For Navjeevan Hospital,</p>
            <p>Opp. New Bus Stand, G.T. Road, Sirhind</p>
            <div className="mt-8 w-48 border-b border-black"></div>
            <div className="flex gap-8 mt-1">
              <span>Dr. Metali Bhatti</span>
              <span>Date: {formatDate(poDate)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
