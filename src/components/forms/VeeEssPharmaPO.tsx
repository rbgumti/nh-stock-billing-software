import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import navjeevanLogo from "@/assets/NH_LOGO.png";
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
  const [logoBase64, setLogoBase64] = useState<string>("");

  // Convert logo to base64 for print window
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setLogoBase64(canvas.toDataURL("image/png"));
      }
    };
    img.src = navjeevanLogo;
  }, []);

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

    if (!logoBase64) {
      setTimeout(handlePrint, 100);
      return;
    }

    const printHTML = printContent.innerHTML.replace(
      /src="[^"]*NH_LOGO[^"]*"/g,
      `src="${logoBase64}"`
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${poNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Times New Roman', Times, serif; padding: 8px 15px; font-size: 10px; line-height: 1.3; }
            .header-section { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 5px; }
            .logo { width: 45px; height: 45px; object-fit: contain; }
            .header-row { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 4px; }
            .hospital-name { font-size: 18px; font-weight: bold; text-align: center; margin: 3px 0; }
            .address-row { text-align: center; font-size: 9px; margin-bottom: 3px; }
            .licence-row { text-align: center; font-size: 8px; margin-bottom: 8px; }
            .ref-po-section { text-align: center; font-size: 10px; margin-bottom: 6px; }
            .to-section { margin-bottom: 8px; font-size: 9px; line-height: 1.4; margin-left: 80px; }
            .subject-section { margin-left: 80px; font-size: 9px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9px; }
            th, td { border: 1px solid #000; padding: 3px 5px; }
            th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            .footer-section { font-size: 9px; margin-top: 15px; margin-left: 80px; line-height: 1.5; }
            .signature-section { font-size: 9px; margin-top: 12px; margin-left: 80px; line-height: 1.4; }
            @media print {
              body { padding: 5mm 10mm; }
              @page { margin: 5mm; size: A4; }
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
    if (!logoBase64) {
      setTimeout(handleDownloadPDF, 100);
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 10;

    // Header row
    pdf.setFontSize(7);
    pdf.text('Regd. Govt of Punjab', 10, y);
    pdf.text('Mob_ 6284942412', pageWidth - 10, y, { align: 'right' });
    y += 5;

    // Logo and Hospital Name
    const logoSize = 12;
    pdf.addImage(logoBase64, 'PNG', pageWidth / 2 - 35, y, logoSize, logoSize);
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y + 7, { align: 'center' });
    pdf.addImage(logoBase64, 'PNG', pageWidth / 2 + 23, y, logoSize, logoSize);
    y += 15;

    // Address
    pdf.setFontSize(7);
    pdf.setFont('times', 'normal');
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib    Dr. Metalli Bhatti', pageWidth / 2, y, { align: 'center' });
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
    pdf.text(`PO NO - ${poNumber}`, 20, y);
    pdf.text(`DATE – ${formatDate(poDate)}`, pageWidth - 20, y, { align: 'right' });
    y += 6;

    // To Section
    pdf.setFontSize(7);
    pdf.setFont('times', 'normal');
    const leftMargin = 30;
    pdf.text('To', leftMargin, y);
    y += 3;
    pdf.setFont('times', 'bold');
    pdf.text('VEE ESS PHARMACEUTICALS', leftMargin, y);
    y += 3;
    pdf.setFont('times', 'normal');
    pdf.text('PATRAN ROAD DRB,SANGRUR', leftMargin, y);
    y += 3;
    pdf.text('PUNJAB-148035', leftMargin, y);
    y += 4;

    pdf.text('Subject:Medicine order', leftMargin, y);
    y += 4;
    pdf.text("Dear Sir,Ma'am", leftMargin, y);
    y += 4;
    pdf.text('Kindly provide us :-', leftMargin, y);
    y += 5;

    // Table
    const tableHeaders = ['Sr. No.', 'Product name', 'Pack', 'Qty.'];
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
        `${index + 1}.`,
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

    // Empty rows
    const emptyRows = Math.max(0, 4 - items.length);
    for (let i = 0; i < emptyRows; i++) {
      let cellX = x;
      colWidths.forEach((width) => {
        pdf.rect(cellX, y, width, 5);
        cellX += width;
      });
      y += 5;
    }
    y += 5;

    // Footer Section
    pdf.setFontSize(7);
    pdf.text('For our centre Navjeevan hospital at below written address at the earliest.', leftMargin, y);
    y += 4;
    pdf.text('Address: Navjeevan hospital Opp.Busstand,Vill.Bara,Sirhind,distt. Fatehgarh sahib.', leftMargin, y);
    y += 5;
    pdf.text('Thanking you', leftMargin, y);
    y += 3;
    pdf.text('Yours Sincerely,', leftMargin, y);
    y += 4;
    pdf.text('Navjeevanhospital,Sirhind', leftMargin, y);
    y += 3;
    pdf.text(`Date: ${formatDateSlash(poDate)}`, leftMargin, y);
    y += 4;
    pdf.text('OPP.NEW BUS STAND,', leftMargin, y);
    y += 3;
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

        <div ref={printRef} className="p-4 bg-white text-black" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '10px', lineHeight: '1.3' }}>
          {/* Header Row */}
          <div className="flex justify-between text-[9px] mb-1">
            <span>Regd. Govt of Punjab</span>
            <span>Mob_ 6284942412</span>
          </div>

          {/* Hospital Header with Logo */}
          <div className="flex items-center justify-center gap-2 my-2">
            <img src={navjeevanLogo} alt="Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-lg font-bold">NAVJEEVAN HOSPITAL</h1>
            <img src={navjeevanLogo} alt="Logo" className="w-10 h-10 object-contain" />
          </div>

          {/* Address Row */}
          <p className="text-center text-[9px] mb-0.5">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;Dr. Metalli Bhatti
          </p>

          {/* Licence Row */}
          <p className="text-center text-[8px] mb-2">
            Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024
          </p>

          {/* REF NO */}
          <div className="text-center text-[10px] mb-1">
            <p>REF NO – {poNumber}</p>
          </div>

          {/* PO NO and Date */}
          <div className="flex justify-between text-[10px] mb-3 px-10">
            <span>PO NO - {poNumber}</span>
            <span>DATE – {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[9px] mb-2 leading-snug ml-20">
            <p className="mb-0.5">To</p>
            <p className="font-bold">VEE ESS PHARMACEUTICALS</p>
            <p>PATRAN ROAD DRB,SANGRUR</p>
            <p>PUNJAB-148035</p>
            <p className="mt-1">Subject:Medicine order</p>
            <p className="mt-1">Dear Sir,Ma&apos;am</p>
            <p className="mt-1">Kindly provide us :-</p>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-2 text-[9px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-1 py-0.5 text-center">Sr. No.</th>
                <th className="border border-black px-1 py-0.5 text-center">Product name</th>
                <th className="border border-black px-1 py-0.5 text-center">Pack</th>
                <th className="border border-black px-1 py-0.5 text-center">Qty.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10*10";
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-1 py-0.5 text-center">{index + 1}.</td>
                    <td className="border border-black px-1 py-0.5">{item.stockItemName}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{packing}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{item.quantity}TAB</td>
                  </tr>
                );
              })}
              {/* Empty rows for consistency */}
              {items.length < 4 && Array.from({ length: 4 - items.length }).map((_, idx) => (
                <tr key={`empty-${idx}`}>
                  <td className="border border-black px-1 py-0.5 text-center">&nbsp;</td>
                  <td className="border border-black px-1 py-0.5">&nbsp;</td>
                  <td className="border border-black px-1 py-0.5 text-center">&nbsp;</td>
                  <td className="border border-black px-1 py-0.5 text-center">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Section */}
          <div className="text-[9px] mt-3 ml-20 leading-snug">
            <p>For our centre Navjeevan hospital at below written address at the earliest.</p>
            <p className="mt-1">Address: Navjeevan hospital Opp.Busstand,Vill.Bara,Sirhind,distt. Fatehgarh sahib.</p>
            <p className="mt-2">Thanking you</p>
            <p>Yours Sincerely,</p>
            <p className="mt-1">Navjeevanhospital,Sirhind</p>
            <p>Date: {formatDateSlash(poDate)}</p>
            <p className="mt-1">OPP.NEW BUS STAND,</p>
            <p>G.T.ROAD, BARA ,SIRHIND</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
