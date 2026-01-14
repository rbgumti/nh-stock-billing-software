import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAppSettings } from "@/hooks/usePerformanceMode";

interface VyadoHealthcarePOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function VyadoHealthcarePO({ poNumber, poDate, items, stockItems, onClose }: VyadoHealthcarePOProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { doctorName } = useAppSettings();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
            @page { 
              size: A4; 
              margin: 12mm 15mm;
            }
            html, body { 
              height: 100%; 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt; 
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
            .header-row { text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 8px; }
            .hospital-name { font-size: 26pt; font-weight: bold; text-align: center; margin-bottom: 10px; }
            .address-row { text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 8px; }
            .licence-row { text-align: center; font-size: 12pt; font-weight: bold; margin-bottom: 16px; }
            .po-date-row { display: flex; justify-content: space-between; font-size: 14pt; font-weight: bold; margin-bottom: 18px; padding: 0 20px; }
            .to-section { margin-bottom: 16px; font-size: 13pt; line-height: 1.6; margin-left: 20px; }
            .subject-section { margin-left: 20px; font-size: 13pt; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13pt; }
            th, td { border: 1px solid #000; padding: 10px 12px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            .flex-spacer { flex: 1; min-height: 30px; }
            .footer-section { font-size: 13pt; margin-top: auto; margin-left: 20px; line-height: 1.8; }
            .signature-section { font-size: 13pt; margin-top: 20px; margin-left: 20px; line-height: 1.8; }
            .stamp-area { height: 60px; width: 200px; border-bottom: 1px dashed #666; margin: 15px 0; }
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
      
      pdf.save(`PO-${poNumber}-VYADO-Healthcare.pdf`);
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
            <span>VYADO Healthcare Purchase Order Format</span>
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

        <div ref={printRef} className="p-6 bg-white text-black min-h-[842px] flex flex-col" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt', lineHeight: '1.5' }}>
          {/* Header - Regd. Govt of Punjab (centered) */}
          <p className="text-center text-[12pt] mb-3">Regd. Govt of Punjab</p>

          {/* Hospital Name (centered) */}
          <h1 className="text-[24pt] font-bold text-center mb-3">NAVJEEVAN HOSPITAL</h1>

          {/* Address Row (centered) */}
          <p className="text-center text-[12pt] mb-1">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib,
          </p>

          {/* Mobile (centered) */}
          <p className="text-center text-[12pt] mb-3">
            Mob: 6284942412
          </p>

          {/* Licence Row (centered) - 2 row space after */}
          <p className="text-center text-[11pt] mb-8">
            Licence No.: PSMHC/Pb./2024/863 | Dt. 2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[13pt] mb-5">
            <span>PO No.: {poNumber}</span>
            <span>Date: {formatDate(poDate)}</span>
          </div>

          {/* To Section - 2 row space after */}
          <div className="text-[12pt] mb-8 leading-relaxed">
            <p className="mb-1">To,</p>
            <p className="font-bold">VYADO HEALTHCARE PVT LTD</p>
            <p>Gali No.4, Vinod Nagar, Hisar</p>
            <p>125001</p>
          </div>

          {/* Subject - 2 row space after */}
          <p className="text-[12pt] mb-8 font-bold">
            <span className="underline">Subject: Medicine Order</span>
          </p>

          {/* Salutation - 2 row space after */}
          <p className="text-[12pt] mb-8">Respected Sir/Madam,</p>

          {/* Intro Paragraph */}
          <p className="text-[11pt] text-justify mb-5 leading-relaxed">
            Kindly provide us the following medicines for our centre Navjeevan Hospital at the below written address at the earliest.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-5 text-[11pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-2 text-center w-[10%]">Sr.</th>
                <th className="border border-black px-2 py-2 text-center w-[50%]">Product Name</th>
                <th className="border border-black px-2 py-2 text-center w-[20%]">Packing</th>
                <th className="border border-black px-2 py-2 text-center w-[20%]">Qty.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10×10";
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-black px-2 py-2">{item.stockItemName}</td>
                    <td className="border border-black px-2 py-2 text-center">{packing}</td>
                    <td className="border border-black px-2 py-2 text-center">{item.quantity} TAB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Flex spacer to push footer to bottom */}
          <div className="flex-1 min-h-4"></div>

          {/* Footer Section */}
          <div className="mt-auto">
            <p className="text-[11pt] leading-relaxed">
              Address: Navjeevan Hospital, Opp. Bus Stand, Vill. Bara, Sirhind, Distt. Fatehgarh Sahib.
            </p>

            {/* 7 row space after content */}
            <div className="h-16"></div>

            {/* Signature Section */}
            <div className="text-[11pt]">
              <p>Thanking You,</p>
              <p>Yours Sincerely,</p>
              
              {/* Maximum space for sign and stamp */}
              <div className="h-32"></div>
              
              <div className="w-48 border-b border-black"></div>
              <div className="flex gap-10 mt-2">
                <span>{doctorName}</span>
                <span>Date: {formatDate(poDate)}</span>
              </div>
              <p className="mt-2">Navjeevan Hospital, Sirhind</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
