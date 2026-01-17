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

  const handlePrint = async () => {
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
              body { display: flex; justify-content: center; align-items: flex-start; }
              img { max-width: 100%; height: auto; }
              @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            <img src="${imgData}" />
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    } catch (error) {
      console.error('Error preparing print:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
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

        <div ref={printRef} className="p-5 bg-white text-black" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '12pt', lineHeight: '1.5', fontWeight: '500' }}>
          {/* Header with Logo */}
          <div className="text-center mb-3 pb-2 border-b-2" style={{ borderColor: '#003366' }}>
            <div className="flex justify-center mb-1">
              <img src={navjeevanLogo} alt="Logo" className="w-14 h-14 object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#003366', letterSpacing: '0.5px' }}>
              NAVJEEVAN HOSPITAL
            </h1>
            <p className="text-xs font-medium text-gray-700">
              Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab) | Ph: 6284942412
            </p>
            <p className="text-[10px] font-medium text-gray-600">Licence No: PSMHC/Pb./2024/863 | {doctorName}</p>
          </div>

          {/* PO Title Badge */}
          <div className="flex justify-center mb-3">
            <div className="px-6 py-2 rounded text-white font-extrabold text-base tracking-wide" style={{ backgroundColor: '#003366' }}>
              PURCHASE ORDER
            </div>
          </div>

          {/* PO Info Grid */}
          <div className="flex justify-between mb-3 p-3 rounded text-sm font-semibold" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div>
              <span className="font-bold" style={{ color: '#003366' }}>PO No: </span>
              <span className="font-bold">{poNumber}</span>
            </div>
            <div>
              <span className="font-bold" style={{ color: '#003366' }}>Date: </span>
              <span className="font-semibold">{formatDate(poDate)}</span>
            </div>
          </div>

          {/* Supplier Box */}
          <div className="p-3 mb-3 rounded text-sm" style={{ backgroundColor: '#f0f7ff', border: '1px solid #0066cc' }}>
            <span className="font-bold" style={{ color: '#003366' }}>TO: </span>
            <span className="font-bold">VYADO HEALTHCARE PVT LTD</span>
            <span className="text-gray-700 font-medium ml-2">| Gali No.4, Vinod Nagar, Hisar - 125001</span>
          </div>

          {/* Subject */}
          <p className="text-sm mb-1 font-medium">
            <span className="font-bold" style={{ color: '#003366' }}>Subject:</span> Medicine Order
          </p>
          <p className="text-sm text-gray-700 mb-3 font-medium">
            Kindly supply the following medicines to Navjeevan Hospital, Bara Sirhind at the earliest.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4 text-sm">
            <thead>
              <tr style={{ backgroundColor: '#003366' }}>
                <th className="p-2.5 text-center text-white font-extrabold border border-gray-300 w-[8%]">Sr.</th>
                <th className="p-2.5 text-left text-white font-extrabold border border-gray-300 w-[52%]">Product Name</th>
                <th className="p-2.5 text-center text-white font-extrabold border border-gray-300 w-[20%]">Packing</th>
                <th className="p-2.5 text-center text-white font-extrabold border border-gray-300 w-[20%]">Qty.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10×10";
                
                return (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td className="border border-gray-300 p-2.5 text-center font-semibold">{index + 1}</td>
                    <td className="border border-gray-300 p-2.5 font-bold">{item.stockItemName}</td>
                    <td className="border border-gray-300 p-2.5 text-center font-semibold">{packing}</td>
                    <td className="border border-gray-300 p-2.5 text-center font-bold">{item.quantity} TAB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Signature Section with ample space for sign & stamp */}
          <div className="flex justify-between text-sm mt-4 pt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
            <div>
              <p className="text-gray-700 font-medium">Thanking You,</p>
              <p className="text-gray-700 font-medium">Yours Sincerely,</p>
              
              {/* Signature line */}
              <div className="mt-20 pt-2 border-t-2 border-gray-500 min-w-[180px]">
                <span className="font-bold text-gray-800">{doctorName}</span>
                <p className="text-gray-600 text-xs font-medium">Navjeevan Hospital, Sirhind</p>
                <p className="text-gray-500 text-[10px] italic mt-1">(Signature & Stamp)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-700 text-xs font-medium">
                Address: Opp. Bus Stand, Bara Sirhind
              </p>
              {/* Space for date */}
              <div className="mt-20 pt-2 border-t-2 border-gray-500 min-w-[140px]">
                <span className="font-bold text-gray-800">Date: {formatDate(poDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
