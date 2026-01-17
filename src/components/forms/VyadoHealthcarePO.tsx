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

        <div ref={printRef} className="p-6 bg-white text-black" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '13pt', lineHeight: '1.6', fontWeight: '600' }}>
          {/* Header with Logo */}
          <div className="text-center mb-4 pb-3 border-b-4" style={{ borderColor: '#003366' }}>
            <div className="flex justify-center mb-2">
              <img src={navjeevanLogo} alt="Logo" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-3xl font-black tracking-wide" style={{ color: '#003366', letterSpacing: '1px' }}>
              NAVJEEVAN HOSPITAL
            </h1>
            <p className="text-sm font-bold text-gray-800 mt-1">
              Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab) | Ph: 6284942412
            </p>
            <p className="text-xs font-bold text-gray-700 mt-0.5">Licence No: PSMHC/Pb./2024/863 | {doctorName}</p>
          </div>

          {/* PO Title Badge */}
          <div className="flex justify-center mb-4">
            <div className="px-8 py-2.5 rounded text-white font-black text-lg tracking-widest shadow-md" style={{ backgroundColor: '#003366' }}>
              PURCHASE ORDER
            </div>
          </div>

          {/* PO Info Grid */}
          <div className="flex justify-between mb-4 p-4 rounded text-base font-bold" style={{ backgroundColor: '#f0f7ff', border: '2px solid #003366' }}>
            <div>
              <span className="font-black" style={{ color: '#003366' }}>PO No: </span>
              <span className="font-black text-gray-900">{poNumber}</span>
            </div>
            <div>
              <span className="font-black" style={{ color: '#003366' }}>Date: </span>
              <span className="font-bold text-gray-900">{formatDate(poDate)}</span>
            </div>
          </div>

          {/* Supplier Box */}
          <div className="p-4 mb-4 rounded text-base" style={{ backgroundColor: '#e8f4fd', border: '2px solid #0066cc' }}>
            <span className="font-black" style={{ color: '#003366' }}>TO: </span>
            <span className="font-black text-gray-900">VYADO HEALTHCARE PVT LTD</span>
            <span className="text-gray-800 font-bold ml-2">| Gali No.4, Vinod Nagar, Hisar - 125001</span>
          </div>

          {/* Subject */}
          <p className="text-base mb-2 font-bold">
            <span className="font-black" style={{ color: '#003366' }}>Subject:</span> <span className="text-gray-900">Medicine Order</span>
          </p>
          <p className="text-base text-gray-800 mb-4 font-semibold">
            Kindly supply the following medicines to Navjeevan Hospital, Bara Sirhind at the earliest.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-6 text-base">
            <thead>
              <tr style={{ backgroundColor: '#003366' }}>
                <th className="p-3 text-center text-white font-black border-2 border-gray-400 w-[8%]">Sr.</th>
                <th className="p-3 text-left text-white font-black border-2 border-gray-400 w-[50%]">Product Name</th>
                <th className="p-3 text-center text-white font-black border-2 border-gray-400 w-[20%]">Packing</th>
                <th className="p-3 text-center text-white font-black border-2 border-gray-400 w-[22%]">Qty.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10×10";
                
                return (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f0f7ff' }}>
                    <td className="border-2 border-gray-400 p-3 text-center font-bold text-gray-900">{index + 1}</td>
                    <td className="border-2 border-gray-400 p-3 font-black text-gray-900">{item.stockItemName}</td>
                    <td className="border-2 border-gray-400 p-3 text-center font-bold text-gray-800">{packing}</td>
                    <td className="border-2 border-gray-400 p-3 text-center font-black text-gray-900">{item.quantity} TAB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Signature Section with ample space for sign & stamp */}
          <div className="flex justify-between text-base mt-6 pt-4" style={{ borderTop: '2px solid #003366' }}>
            <div>
              <p className="text-gray-800 font-bold">Thanking You,</p>
              <p className="text-gray-800 font-bold">Yours Sincerely,</p>
              
              {/* Large signature area */}
              <div className="mt-28 pt-3 border-t-2 border-gray-600 min-w-[220px]">
                <span className="font-black text-gray-900 text-lg">{doctorName}</span>
                <p className="text-gray-700 text-sm font-bold">Navjeevan Hospital, Sirhind</p>
                <p className="text-gray-600 text-xs font-semibold italic mt-1">(Signature & Stamp)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-800 text-sm font-bold">
                Address: Opp. Bus Stand, Bara Sirhind
              </p>
              {/* Space for date aligned with signature */}
              <div className="mt-28 pt-3 border-t-2 border-gray-600 min-w-[160px]">
                <span className="font-black text-gray-900 text-lg">Date: {formatDate(poDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
