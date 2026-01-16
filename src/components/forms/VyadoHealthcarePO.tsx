import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import navjeevanLogo from "@/assets/NH_LOGO.png";

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
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  const getStockItemDetails = (stockItemId: number) => {
    return stockItems.find(item => item.id === stockItemId);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${poNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.4; padding: 15px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
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

        <div ref={printRef} className="p-4 bg-white text-black" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '10pt', lineHeight: '1.3' }}>
          {/* Header with Logo - Compact */}
          <div className="text-center mb-2 pb-2 border-b-2" style={{ borderColor: '#003366' }}>
            <div className="flex justify-center mb-1">
              <img src={navjeevanLogo} alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-lg font-bold" style={{ color: '#003366', letterSpacing: '0.5px' }}>
              NAVJEEVAN HOSPITAL
            </h1>
            <p className="text-[9px] text-gray-700">
              Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab) | Ph: 6284942412
            </p>
            <p className="text-[8px] text-gray-500">Licence No: PSMHC/Pb./2024/863 | {doctorName}</p>
          </div>

          {/* PO Title Badge - Compact */}
          <div className="flex justify-center mb-2">
            <div className="px-4 py-1 rounded text-white font-bold text-xs" style={{ backgroundColor: '#003366' }}>
              PURCHASE ORDER
            </div>
          </div>

          {/* PO Info Grid - Compact */}
          <div className="flex justify-between mb-2 p-2 rounded text-[10px]" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div>
              <span className="font-bold" style={{ color: '#003366' }}>PO No: </span>
              <span className="font-semibold">{poNumber}</span>
            </div>
            <div>
              <span className="font-bold" style={{ color: '#003366' }}>Date: </span>
              <span>{formatDate(poDate)}</span>
            </div>
          </div>

          {/* Supplier Box - Compact */}
          <div className="p-2 mb-2 rounded text-[10px]" style={{ backgroundColor: '#f0f7ff', border: '1px solid #0066cc' }}>
            <span className="font-bold" style={{ color: '#003366' }}>TO: </span>
            <span className="font-semibold">VYADO HEALTHCARE PVT LTD</span>
            <span className="text-gray-600 ml-2">| Gali No.4, Vinod Nagar, Hisar - 125001</span>
          </div>

          {/* Subject - Compact */}
          <p className="text-[10px] mb-1">
            <span className="font-bold" style={{ color: '#003366' }}>Subject:</span> Medicine Order
          </p>
          <p className="text-[10px] text-gray-700 mb-2">
            Kindly supply the following medicines to Navjeevan Hospital, Bara Sirhind at the earliest.
          </p>

          {/* Items Table - Compact */}
          <table className="w-full border-collapse mb-2 text-[10px]">
            <thead>
              <tr style={{ backgroundColor: '#003366' }}>
                <th className="p-1.5 text-center text-white font-bold border border-gray-300 w-[8%]">Sr.</th>
                <th className="p-1.5 text-left text-white font-bold border border-gray-300 w-[52%]">Product Name</th>
                <th className="p-1.5 text-center text-white font-bold border border-gray-300 w-[20%]">Packing</th>
                <th className="p-1.5 text-center text-white font-bold border border-gray-300 w-[20%]">Qty.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10×10";
                
                return (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td className="border border-gray-300 p-1.5 text-center">{index + 1}</td>
                    <td className="border border-gray-300 p-1.5 font-medium">{item.stockItemName}</td>
                    <td className="border border-gray-300 p-1.5 text-center">{packing}</td>
                    <td className="border border-gray-300 p-1.5 text-center font-semibold">{item.quantity} TAB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Signature Section - Compact */}
          <div className="flex justify-between text-[10px] mt-3 pt-2" style={{ borderTop: '1px solid #e2e8f0' }}>
            <div>
              <p className="text-gray-700">Thanking You,</p>
              <div className="mt-6 pt-1 border-t border-gray-400 min-w-[120px]">
                <span className="font-semibold text-gray-700">{doctorName}</span>
                <p className="text-gray-600 text-[8px]">Navjeevan Hospital</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-600 text-[9px]">
                Address: Opp. Bus Stand, Bara Sirhind
              </p>
              <div className="mt-6 pt-1 border-t border-gray-400 min-w-[100px]">
                <span className="font-semibold text-gray-700">Date: {formatDate(poDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
