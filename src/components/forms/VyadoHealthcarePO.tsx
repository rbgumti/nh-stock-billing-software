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
      // Use scale 3 for high-fidelity rendering (matching professional document standards)
      const canvas = await html2canvas(printContent, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit exactly on one A4 page
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Scale down if content exceeds page height to ensure single-page fit
      if (imgHeight > pageHeight) {
        const scaleFactor = pageHeight / imgHeight;
        const scaledWidth = imgWidth * scaleFactor;
        const xOffset = (pageWidth - scaledWidth) / 2; // Center horizontally
        pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, pageHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }
      
      const sanitizedPONumber = poNumber.replace(/[^a-zA-Z0-9-_]/g, '-');
      pdf.save(`PO-${sanitizedPONumber}-VYADO-Healthcare.pdf`);
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

        <div ref={printRef} className="p-4 bg-white text-black flex flex-col" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '11pt', lineHeight: '1.4', fontWeight: '600', minHeight: '842px', height: '842px' }}>
          {/* Header with Logo */}
          <div className="text-center mb-2 pb-2 border-b-2" style={{ borderColor: '#003366' }}>
            <div className="flex justify-center mb-1">
              <img src={navjeevanLogo} alt="Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-2xl font-black tracking-wide" style={{ color: '#003366', letterSpacing: '1px' }}>
              NAVJEEVAN HOSPITAL
            </h1>
            <p className="text-xs font-bold text-gray-800 mt-0.5">
              Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab) | Ph: 6284942412
            </p>
            <p className="text-xs font-bold text-gray-700">Licence No: PSMHC/Pb./2024/863 | {doctorName}</p>
          </div>

          {/* PO Title Badge */}
          <div className="flex justify-center mb-2">
            <div className="px-6 py-1.5 rounded text-white font-black text-sm tracking-widest shadow-md" style={{ backgroundColor: '#003366' }}>
              PURCHASE ORDER
            </div>
          </div>

          {/* PO Info Grid */}
          <div className="flex justify-between mb-2 p-2 rounded text-sm font-bold" style={{ backgroundColor: '#f0f7ff', border: '1px solid #003366' }}>
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
          <div className="p-2 mb-2 rounded text-sm" style={{ backgroundColor: '#e8f4fd', border: '1px solid #0066cc' }}>
            <span className="font-black" style={{ color: '#003366' }}>TO: </span>
            <span className="font-black text-gray-900">VYADO HEALTHCARE PVT LTD</span>
            <span className="text-gray-800 font-bold ml-2">| Gali No.4, Vinod Nagar, Hisar - 125001</span>
          </div>

          {/* Subject */}
          <p className="text-sm mb-1 font-bold">
            <span className="font-black" style={{ color: '#003366' }}>Subject:</span> <span className="text-gray-900">Medicine Order</span>
          </p>
          <p className="text-sm text-gray-800 mb-2 font-semibold">
            Kindly supply the following medicines to Navjeevan Hospital, Bara Sirhind at the earliest.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-2 text-sm">
            <thead>
              <tr style={{ backgroundColor: '#003366' }}>
                <th className="p-2 text-center text-white font-black border border-gray-400 w-[8%]">Sr.</th>
                <th className="p-2 text-left text-white font-black border border-gray-400 w-[50%]">Product Name</th>
                <th className="p-2 text-center text-white font-black border border-gray-400 w-[20%]">Packing</th>
                <th className="p-2 text-center text-white font-black border border-gray-400 w-[22%]">Qty.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10×10";
                
                return (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f0f7ff' }}>
                    <td className="border border-gray-400 p-2 text-center font-bold text-gray-900">{index + 1}</td>
                    <td className="border border-gray-400 p-2 font-black text-gray-900">{item.stockItemName}</td>
                    <td className="border border-gray-400 p-2 text-center font-bold text-gray-800">{packing}</td>
                    <td className="border border-gray-400 p-2 text-center font-black text-gray-900">{item.quantity} TAB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Flex spacer to push content to fill page */}
          <div className="flex-grow"></div>

          {/* Signature Section */}
          <div className="mt-auto">
            <div className="pt-2" style={{ borderTop: '1px solid #003366' }}>
              <p className="text-gray-800 font-bold text-sm">Thanking You,</p>
              <p className="text-gray-800 font-bold text-sm">Yours Sincerely,</p>
            </div>
            
            {/* Signature Section - Two columns */}
            <div className="flex justify-between text-sm mt-2">
              {/* Left Column - Doctor Details */}
              <div className="text-left">
                {/* Space for signature */}
                <div className="min-h-[40px]"></div>
                <div className="pt-1 border-t border-gray-600 min-w-[180px]">
                  <span className="font-black text-sm" style={{ color: '#003366' }}>{doctorName}</span>
                  <p className="text-gray-700 text-xs font-bold">Navjeevan Hospital, Sirhind</p>
                  <p className="text-gray-600 text-xs font-semibold italic">(Signature & Stamp)</p>
                </div>
              </div>
              {/* Right Column - Date with signature line */}
              <div className="text-right flex flex-col justify-end">
                {/* Space for signature */}
                <div className="min-h-[40px]"></div>
                <div className="pt-1 border-t border-gray-600 min-w-[140px]">
                  <span className="font-black text-sm" style={{ color: '#003366' }}>Date: {formatDate(poDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Blue background bar */}
          <div className="mt-2 text-center text-xs font-black py-1.5 px-3 rounded" style={{ backgroundColor: '#003366' }}>
            <p className="text-white">
              NAVJEEVAN HOSPITAL - Opp. Bus Stand, Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
