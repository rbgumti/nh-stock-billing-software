import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
            @page { 
              size: A4; 
              margin: 10mm 12mm;
            }
            html, body { 
              height: 100%; 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 11pt; 
              line-height: 1.5;
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
            .header-row { display: flex; justify-content: flex-end; margin-bottom: 6px; font-size: 12pt; }
            .hospital-name { font-size: 24pt; font-weight: bold; text-align: center; margin: 8px 0; }
            .address-row { text-align: center; font-size: 12pt; margin-bottom: 5px; }
            .licence-row { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 14px; }
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 13pt; font-weight: bold; }
            .to-section { margin-bottom: 12px; font-size: 12pt; line-height: 1.6; }
            .sub-line { font-size: 13pt; font-weight: bold; margin: 12px 0; text-decoration: underline; }
            .salutation { margin: 10px 0; font-size: 12pt; }
            .intro-para { font-size: 12pt; text-align: justify; margin-bottom: 12px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12pt; }
            th, td { border: 1px solid #000; padding: 8px 10px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .flex-spacer { flex: 1; min-height: 20px; }
            .undertaking-title { font-weight: bold; font-size: 12pt; margin: 14px 0 8px 0; text-decoration: underline; }
            .undertaking-text { font-size: 11pt; text-align: justify; line-height: 1.5; margin-bottom: 14px; }
            .for-line { font-size: 12pt; margin: 14px 0 25px 0; }
            .signature-section { display: flex; justify-content: flex-start; margin-top: 12px; font-size: 12pt; }
            .signature-line { border-bottom: 1px solid #000; width: 200px; margin: 20px 0 8px 0; }
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

  const handleDownloadPDF = async () => {
    const printContent = printRef.current;
    if (!printContent) return;

    setIsGeneratingPDF(true);
    
    try {
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      
      pdf.save(`PO-${poNumber}-Rusan-Pharma.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Rusan Pharma Purchase Order Format</span>
            <div className="flex gap-2">
              <Button onClick={handleDownloadPDF} size="sm" variant="outline" className="flex items-center gap-2" disabled={isGeneratingPDF}>
                {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                PDF
              </Button>
              <Button onClick={handlePrint} size="sm" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-6 bg-white text-black min-h-[842px] flex flex-col" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '12pt', lineHeight: '1.6' }}>
          {/* Header Row - Regd on right */}
          <div className="flex justify-end text-[12pt] mb-3">
            <span>Regd. Govt of Punjab</span>
          </div>

          {/* Hospital Name */}
          <h1 className="text-[24pt] font-bold text-center my-3">NAVJEEVAN HOSPITAL</h1>

          {/* Address Row */}
          <p className="text-center text-[12pt] mb-1">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib,
          </p>

          {/* Mobile */}
          <p className="text-center text-[12pt] mb-3">
            Mob: 6284942412
          </p>

          {/* Licence Row with pipe separator */}
          <p className="text-center text-[11pt] font-bold mb-5">
            Licence No.: PSMHC/Pb./2024/863 | Dt. 2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[14pt] mb-6">
            <span>PO No.: NH-25-26-{getPONumberSuffix()}</span>
            <span>Date: {formatDate(poDate)}</span>
          </div>

          {/* To Section - inline format */}
          <div className="text-[12pt] mb-4 leading-relaxed">
            <p className="mb-1">To: <span className="font-bold">Rusan Pharma Ltd.,</span></p>
            <p>Khasra No. 122MI, Central Hope Town, Selaqui, Dehradun, Uttarakhand-248197</p>
          </div>

          {/* Subject line */}
          <p className="font-bold text-[13pt] my-4 underline">Subject: Purchase Order</p>

          {/* Salutation */}
          <p className="text-[12pt] my-4">Dear Sir/Madam,</p>

          {/* Intro Paragraph - concise version */}
          <p className="text-[12pt] text-justify mb-5 leading-relaxed">
            We place a purchase order with authorized doctor&apos;s stamp and signature. Terms per telephone discussion. Payment by cheque to your bank account.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse my-5 text-[12pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-3 text-center w-[7%]">Sr.</th>
                <th className="border border-black px-2 py-3 text-center w-[18%]">Product</th>
                <th className="border border-black px-2 py-3 text-center w-[35%]">Compositions</th>
                <th className="border border-black px-2 py-3 text-center w-[12%]">Pack</th>
                <th className="border border-black px-2 py-3 text-center w-[14%]">Strips</th>
                <th className="border border-black px-2 py-3 text-center w-[14%]">Tablets</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = item.packSize || stockItem?.packing || "10×10";
                const qtyInStrips = item.qtyInStrips || item.quantity;
                const qtyInTabs = item.qtyInTabs || (() => {
                  const packingMatch = packing.match(/(\d+)[×x*](\d+)/i);
                  const tabletsPerStrip = packingMatch ? parseInt(packingMatch[1]) * parseInt(packingMatch[2]) : 10;
                  return qtyInStrips * tabletsPerStrip;
                })();
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-2 py-3 text-center">{index + 1}</td>
                    <td className="border border-black px-2 py-3">{item.stockItemName}</td>
                    <td className="border border-black px-2 py-3">{stockItem?.composition || '-'}</td>
                    <td className="border border-black px-2 py-3 text-center">{packing.replace('*', '×')}</td>
                    <td className="border border-black px-2 py-3 text-right">{qtyInStrips.toLocaleString()}</td>
                    <td className="border border-black px-2 py-3 text-right">{qtyInTabs.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Flex spacer to push undertaking to bottom */}
          <div className="flex-1 min-h-4"></div>

          {/* Undertaking */}
          <div className="mt-auto">
            <p className="font-bold text-[12pt] mb-2 underline">UNDERTAKING:</p>
            <p className="text-[11pt] text-justify leading-relaxed mb-5">
              We confirm purchase from Rusan Pharma Ltd. under P.O. No. {getPONumberSuffix()}/A ({formatDate(poDate)}). These controlled substances per Narcotic Drugs and Psychotropic Substances Act, 1985, shall be maintained with full records. Form-6 (Consignment Note) will be submitted upon receipt. Products are exclusively for our De-addiction Centre and qualified doctors only, licensed under PSMHC/Punjab/2024/863, sales within India only, no retail or export. Rusan Pharma Ltd. not liable for non-compliance by us.
            </p>

            <p className="text-[12pt] mb-1">
              For Navjeevan Hospital,
            </p>
            <p className="text-[12pt] mb-5">
              Opp. New Bus Stand, G.T. Road, Sirhind
            </p>

            {/* Space for stamp and signature */}
            <div className="h-16 my-3 border-b border-black w-48">
            </div>

            {/* Signature Section */}
            <div className="flex gap-16 items-end text-[12pt]">
              <p>{doctorName}</p>
              <p>Date: {formatDate(poDate)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
