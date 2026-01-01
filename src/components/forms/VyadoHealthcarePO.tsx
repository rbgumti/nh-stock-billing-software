import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import jsPDF from "jspdf";

interface VyadoHealthcarePOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function VyadoHealthcarePO({ poNumber, poDate, items, stockItems, onClose }: VyadoHealthcarePOProps) {
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
            .ref-po-section { text-align: center; font-size: 9px; margin-bottom: 4px; }
            .to-section { margin-bottom: 4px; font-size: 8px; line-height: 1.3; margin-left: 20px; }
            .subject-section { margin-left: 20px; font-size: 8px; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 8px; }
            th, td { border: 1px solid #000; padding: 2px 3px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            .footer-section { font-size: 8px; margin-top: 8px; margin-left: 20px; line-height: 1.3; }
            .signature-section { font-size: 8px; margin-top: 8px; margin-left: 20px; line-height: 1.3; }
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

    // Header row
    pdf.setFontSize(7);
    pdf.text('Regd. Govt of Punjab', 10, y);
    pdf.text('Mob_ 6284942412', pageWidth - 10, y, { align: 'right' });
    y += 5;

    // Hospital Name (centered)
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y + 6, { align: 'center' });
    y += 12;

    // Address
    pdf.setFontSize(7);
    pdf.setFont('times', 'normal');
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib    Dr. Metali Bhatti', pageWidth / 2, y, { align: 'center' });
    y += 4;

    // Licence
    pdf.setFontSize(6);
    pdf.text('Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 6;

    // REF NO
    pdf.setFontSize(8);
    pdf.text(`REF NO – ${poNumber}`, pageWidth / 2, y, { align: 'center' });
    y += 5;

    // PO Number and Date
    pdf.setFont('times', 'bold');
    pdf.text(`PO NO ${poNumber}`, 20, y);
    pdf.text(`Date- ${formatDate(poDate)}`, pageWidth - 20, y, { align: 'right' });
    y += 6;

    // To Section
    pdf.setFontSize(7);
    pdf.setFont('times', 'normal');
    const leftMargin = 25;
    pdf.text('To', leftMargin, y);
    y += 3;
    pdf.setFont('times', 'bold');
    pdf.text('VYADO HEALTHCARE PVT LTD', leftMargin, y);
    y += 3;
    pdf.setFont('times', 'normal');
    pdf.text('Gali no.4,VinodNagar,Hisar', leftMargin, y);
    y += 3;
    pdf.text('125001', leftMargin, y);
    y += 5;

    pdf.text('Subject: Medicine order', leftMargin, y);
    y += 4;
    pdf.text("Respected Sir/Ma'am", leftMargin, y);
    y += 4;
    pdf.text('Kindly provide us :-', leftMargin, y);
    y += 5;

    // Table
    const tableHeaders = ['SR.NO.', 'PRODUCT NAME', 'packing', 'QTY.'];
    const colWidths = [20, 90, 35, 35];
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

      const rowData = [
        `${index + 1}`,
        item.stockItemName,
        packing,
        `${item.quantity}TAB`
      ];

      let cellX = x;
      rowData.forEach((cell, i) => {
        pdf.rect(cellX, y, colWidths[i], 5);
        const align = i === 0 || i >= 2 ? 'center' : 'left';
        const textX = align === 'center' ? cellX + colWidths[i] / 2 : cellX + 1;
        pdf.text(cell, textX, y + 3.5, { align });
        cellX += colWidths[i];
      });
      y += 5;
    });
    y += 5;

    // Footer Section
    pdf.setFontSize(7);
    pdf.text('For our centre Navjeevan hospital at below written address at the earliest.', leftMargin, y);
    y += 4;
    pdf.text('Address: Navjeevan hospital Opp.Busstand,Vill.Bara,Sirhind,distt. Fatehgarh sahib.', leftMargin, y);
    y += 6;

    // Signature Section
    pdf.text('Thanking you', leftMargin, y);
    y += 3;
    pdf.text('Yours Sincerely,', leftMargin, y);
    y += 4;
    pdf.text('Navjeevan Hospital,', leftMargin, y);
    y += 3;
    pdf.text('OPP.NEW BUS STAND,', leftMargin, y);
    y += 3;
    pdf.text('G.T.ROAD, BARA,SIRHIND,', leftMargin, y);

    pdf.save(`PO-${poNumber}-VYADO-Healthcare.pdf`);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>VYADO Healthcare Purchase Order Format</span>
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
          <div className="flex justify-between text-[9px] mb-1">
            <span>Regd. Govt of Punjab</span>
            <span>Mob_ 6284942412</span>
          </div>

          {/* Hospital Header */}
          <div className="my-1">
            <h1 className="text-base font-bold text-center">NAVJEEVAN HOSPITAL</h1>
          </div>

          {/* Address Row */}
          <p className="text-center text-[9px] mb-0.5">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;Dr. Metali Bhatti
          </p>

          {/* Licence Row */}
          <p className="text-center text-[8px] mb-2">
            Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024
          </p>

          {/* REF NO and PO NO */}
          <div className="text-center text-[10px] mb-1">
            <p>REF NO – {poNumber}</p>
          </div>
          <div className="flex justify-between text-[10px] mb-3 px-10">
            <span>PO NO {poNumber}</span>
            <span>Date- {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[9px] mb-2 leading-snug ml-16">
            <p className="mb-0.5">To</p>
            <p className="font-bold">VYADO HEALTHCARE PVT LTD</p>
            <p>Gali no.4,VinodNagar,Hisar</p>
            <p>125001</p>
          </div>

          {/* Subject Section */}
          <div className="text-[9px] mb-2 ml-16">
            <p>Subject: Medicine order</p>
            <p className="mt-1">Respected Sir/Ma&apos;am</p>
            <p className="mt-1">Kindly provide us :-</p>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-2 text-[9px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-1 py-0.5 text-center">SR.NO.</th>
                <th className="border border-black px-1 py-0.5 text-center">PRODUCT NAME</th>
                <th className="border border-black px-1 py-0.5 text-center">packing</th>
                <th className="border border-black px-1 py-0.5 text-center">QTY.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10*10";
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-1 py-0.5 text-center">{index + 1}</td>
                    <td className="border border-black px-1 py-0.5">{item.stockItemName}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{packing}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{item.quantity}TAB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Section */}
          <div className="text-[9px] mt-3 ml-16 leading-snug">
            <p>For our centre Navjeevan hospital at below written address at the earliest.</p>
            <p className="mt-1">Address: Navjeevan hospital Opp.Busstand,Vill.Bara,Sirhind,distt. Fatehgarh sahib.</p>
          </div>

          {/* Signature Section */}
          <div className="text-[9px] mt-4 ml-16 leading-snug">
            <p>Thanking you</p>
            <p>Yours Sincerely,</p>
            <p className="mt-1">Navjeevan Hospital,</p>
            <p>OPP.NEW BUS STAND,</p>
            <p>G.T.ROAD, BARA,SIRHIND,</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
