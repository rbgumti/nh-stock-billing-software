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
            body { font-family: 'Times New Roman', Times, serif; padding: 6px 12px; font-size: 9px; line-height: 1.2; }
            .header-row { display: flex; justify-content: space-between; font-size: 8px; margin-bottom: 2px; }
            .header-section { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
            .logo { width: 32px; height: 32px; object-fit: contain; }
            .hospital-name { font-size: 16px; font-weight: bold; flex: 1; text-align: center; }
            .address-row { text-align: center; font-size: 8px; margin-bottom: 2px; }
            .licence-row { text-align: center; font-size: 7px; margin-bottom: 4px; }
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 9px; font-weight: bold; }
            .to-section { margin-bottom: 4px; font-size: 8px; line-height: 1.3; }
            .salutation { margin: 4px 0 3px 0; font-size: 8px; }
            .intro-para { font-size: 8px; text-align: justify; margin-bottom: 4px; line-height: 1.3; }
            table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 8px; }
            th, td { border: 1px solid #000; padding: 2px 3px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .undertaking-title { font-weight: bold; font-size: 8px; margin: 6px 0 3px 0; text-align: right; }
            .undertaking-text { font-size: 7px; text-align: justify; line-height: 1.2; margin-bottom: 6px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 10px; font-size: 8px; }
            @media print {
              body { padding: 4mm 8mm; }
              @page { margin: 4mm; size: A4; }
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
    let y = 10;

    // Header row - bold
    pdf.setFontSize(7);
    pdf.setFont('times', 'bold');
    pdf.text('Regd. Govt of Punjab', 10, y);
    pdf.text('Mob: 6284942412', pageWidth - 10, y, { align: 'right' });
    y += 5;

    // Hospital Name (centered) - bold
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y + 6, { align: 'center' });
    y += 12;

    // Address - bold
    pdf.setFontSize(7);
    pdf.setFont('times', 'bold');
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib    Dr. Metalli Bhatti', pageWidth / 2, y, { align: 'center' });
    y += 4;

    // Licence - bold
    pdf.setFontSize(6);
    pdf.setFont('times', 'bold');
    pdf.text('Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 6;

    // PO Number and Date - bold
    pdf.setFontSize(8);
    pdf.setFont('times', 'bold');
    pdf.text(`P.O NO: ${poNumber}`, 10, y);
    pdf.text(`DATE: ${formatDate(poDate)}`, pageWidth - 10, y, { align: 'right' });
    y += 6;

    // To Section
    pdf.setFontSize(7);
    pdf.setFont('times', 'normal');
    pdf.text('To,', 10, y);
    y += 3;
    pdf.setFont('times', 'bold');
    pdf.text('PARB PHARMACEUTICALS PVT. LTD.', 10, y);
    y += 3;
    pdf.setFont('times', 'normal');
    pdf.text('E-9,INDUSTRIAL AREA SIIDCUL,SILAQULI', 10, y);
    y += 3;
    pdf.text('DEHRADUN UTTARAKHAND', 10, y);
    y += 4;

    pdf.text('Subject: purchase order.', 10, y);
    y += 4;
    pdf.text("Dear sir,ma'am", 10, y);
    y += 5;

    // Intro paragraph
    const introText = "We hereby placing a purchase order , Terms and Conditions will remain same as Our discussion on phonically. payment of product shall be done through cheque to your bank account. The name and composition of product give below, please do the supply earlier as possible.";
    const splitIntro = pdf.splitTextToSize(introText, pageWidth - 20);
    pdf.text(splitIntro, 10, y);
    y += splitIntro.length * 3 + 3;

    // Table
    const tableHeaders = ['S. No.', 'Product Name', 'composition', 'QTY IN TABLETS', 'PACKING'];
    const colWidths = [15, 55, 55, 35, 25];
    let x = 10;

    // Table header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(x, y, pageWidth - 20, 5, 'F');
    pdf.setFontSize(6);
    pdf.setFont('times', 'bold');
    tableHeaders.forEach((header, i) => {
      pdf.text(header, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + colWidths[i] / 2, y + 3.5, { align: 'center' });
    });
    pdf.rect(x, y, pageWidth - 20, 5);
    y += 5;

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
        qtyInTablets.toLocaleString(),
        packing
      ];

      let cellX = x;
      rowData.forEach((cell, i) => {
        pdf.rect(cellX, y, colWidths[i], 5);
        const align = i === 0 || i === 4 ? 'center' : i === 3 ? 'right' : 'left';
        const textX = align === 'center' ? cellX + colWidths[i] / 2 : align === 'right' ? cellX + colWidths[i] - 1 : cellX + 1;
        pdf.text(cell, textX, y + 3.5, { align });
        cellX += colWidths[i];
      });
      y += 5;
    });
    y += 3;

    // Undertaking
    pdf.setFont('times', 'bold');
    pdf.setFontSize(7);
    pdf.text('UNDERTAKING', pageWidth - 10, y, { align: 'right' });
    y += 4;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(6);
    const undertakingText = `We hereby confirm that the products which we intend to buy from PARA PHARMACEUTICALS PVT. LTD. E-9,INDUSTRIAL AREA SIIDCUL,SILAQUI DEHRADUN UTTARAKHAND INDIA Our P.O.NO ${poNumber} .dt- ${formatDate(poDate)}.These products purchased by us will be exclusively sold by psychiatric clinic and hospital in addition to the designated de-addiction centers and hospital with de addiction facilities only ,on our License no PSMHC/Pb./2024/863.We are full aware these products containing controlled substance as per Narcotic drugs & psychotropic substance Act 1985,and we will keep the relevant records of sale and purchase to us. Also we assure our acknowledgement in form 6(consignment note) for receipt of above purchase item to supplier immediately on receipt of above controlled substances. Further we undertake that we are taking the products for sale of below mentioned formulation &for its sale within india only & not meant for export.`;
    const splitUndertaking = pdf.splitTextToSize(undertakingText, pageWidth - 20);
    pdf.text(splitUndertaking, 10, y);
    y += splitUndertaking.length * 2.5 + 4;

    pdf.setFontSize(7);
    pdf.text(`Date. ${formatDate(poDate)}`, 10, y);
    y += 8;

    // Signature section
    pdf.text('for Navjeevan hospital, sirhind', pageWidth / 2, y, { align: 'center' });
    pdf.text('Dr.Metalli Bhatti', pageWidth - 10, y, { align: 'right' });

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

        <div ref={printRef} className="p-4 bg-white text-black" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '10px', lineHeight: '1.3' }}>
          {/* Header Row */}
          <div className="flex justify-between text-[9px] font-bold mb-1">
            <span>Regd. Govt of Punjab</span>
            <span>Mob: 6284942412</span>
          </div>

          {/* Hospital Header */}
          <div className="my-1">
            <h1 className="text-base font-bold text-center">NAVJEEVAN HOSPITAL</h1>
          </div>

          {/* Address Row */}
          <p className="text-center text-[9px] font-bold mb-0.5">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;Dr. Metalli Bhatti
          </p>

          {/* Licence Row */}
          <p className="text-center text-[8px] font-bold mb-2">
            Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[10px] mb-3">
            <span>P.O NO: {poNumber}</span>
            <span>DATE: {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[9px] mb-2 leading-snug">
            <p className="mb-0.5">To,</p>
            <p className="font-bold">PARB PHARMACEUTICALS PVT. LTD.</p>
            <p>E-9,INDUSTRIAL AREA SIIDCUL,SILAQULI</p>
            <p>DEHRADUN UTTARAKHAND</p>
          </div>

          {/* Subject */}
          <p className="text-[9px] mb-1">Subject: purchase order.</p>

          {/* Salutation */}
          <p className="text-[9px] mb-1">Dear sir,ma&apos;am</p>

          {/* Intro Paragraph */}
          <p className="text-[9px] text-justify mb-2 leading-snug">
            We hereby placing a purchase order , Terms and Conditions will remain same as Our discussion on phonically. payment of product shall be done through cheque to your bank account. The name and composition of product give below, please do the supply earlier as possible.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-2 text-[9px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-1 py-0.5 text-center">S. No.</th>
                <th className="border border-black px-1 py-0.5 text-center">Product Name</th>
                <th className="border border-black px-1 py-0.5 text-center">composition</th>
                <th className="border border-black px-1 py-0.5 text-center">QTY IN TABLETS</th>
                <th className="border border-black px-1 py-0.5 text-center">PACKING</th>
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
                    <td className="border border-black px-1 py-0.5 text-center">{index + 1}.</td>
                    <td className="border border-black px-1 py-0.5">{item.stockItemName}</td>
                    <td className="border border-black px-1 py-0.5">{stockItem?.composition || '-'}</td>
                    <td className="border border-black px-1 py-0.5 text-right">{qtyInTablets.toLocaleString()}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{packing}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Undertaking */}
          <p className="font-bold text-[9px] mb-1 text-right">UNDERTAKING</p>
          <p className="text-[8px] text-justify leading-snug mb-3">
            We hereby confirm that the products which we intend to buy from PARA PHARMACEUTICALS PVT. LTD. E-9,INDUSTRIAL AREA SIIDCUL,SILAQUI DEHRADUN UTTARAKHAND INDIA Our P.O.NO {poNumber} .dt- {formatDate(poDate)}.These products purchased by us will be exclusively sold by psychiatric clinic and hospital in addition to the designated de-addiction centers and hospital with de addiction facilities only ,on our License no PSMHC/Pb./2024/863.We are full aware these products containing controlled substance as per Narcotic drugs &amp; psychotropic substance Act 1985,and we will keep the relevant records of sale and purchase to us. Also we assure our acknowledgement in form 6(consignment note) for receipt of above purchase item to supplier immediately on receipt of above controlled substances. Further we undertake that we are taking the products for sale of below mentioned formulation &amp;for its sale within india only &amp; not meant for export.
          </p>

          {/* Date and Signature Section */}
          <div className="text-[9px] mb-4">
            <p>Date. {formatDate(poDate)}</p>
          </div>

          {/* Signature Section */}
          <div className="flex justify-between items-end mt-4 text-[9px]">
            <div></div>
            <div className="text-center">
              <p>for Navjeevan hospital, sirhind</p>
            </div>
            <div className="text-right">
              <p>Dr.Metalli Bhatti</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
