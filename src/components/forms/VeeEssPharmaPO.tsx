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

interface VeeEssPharmaPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function VeeEssPharmaPO({ poNumber, poDate, items, stockItems, onClose }: VeeEssPharmaPOProps) {
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
      
      pdf.save(`PO-${poNumber}-VEE-ESS-Pharma.pdf`);
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
            <span>VEE ESS Pharmaceuticals Purchase Order Format</span>
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

        <div ref={printRef} className="p-6 bg-white text-black min-h-[842px] flex flex-col" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '11pt', lineHeight: '1.5' }}>
          {/* Header with Logo */}
          <div className="text-center mb-4 pb-3 border-b-4" style={{ borderBottomStyle: 'double', borderColor: '#003366' }}>
            <div className="flex justify-center mb-2">
              <img src={navjeevanLogo} alt="Logo" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#003366', letterSpacing: '1px' }}>
              NAVJEEVAN HOSPITAL
            </h1>
            <p className="text-xs italic text-gray-500 mb-1">Healthcare with Compassion</p>
            <p className="text-xs text-gray-700 mb-1">
              Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
            <p className="text-xs text-gray-600">Phone: 6284942412 | {doctorName}</p>
            <p className="text-xs text-gray-500">Licence No: PSMHC/Pb./2024/863 | Regd. Govt of Punjab</p>
          </div>

          {/* PO Title Badge */}
          <div className="flex justify-center mb-4">
            <div className="px-6 py-1.5 rounded-lg text-white font-bold text-sm tracking-wide" style={{ backgroundColor: '#003366' }}>
              PURCHASE ORDER
            </div>
          </div>

          {/* PO Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-lg text-xs" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="flex">
              <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>PO Number:</span>
              <span className="font-semibold">{poNumber}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>PO Date:</span>
              <span>{formatDate(poDate)}</span>
            </div>
          </div>

          {/* Supplier Box */}
          <div className="p-3 mb-4 rounded-lg text-xs" style={{ backgroundColor: '#f0f7ff', border: '2px solid #0066cc' }}>
            <span className="font-bold" style={{ color: '#003366' }}>TO: </span>
            <span className="font-semibold">VEE ESS PHARMACEUTICALS</span>
            <p className="text-gray-700 mt-1">Patran Road DRB, Sangrur, Punjab - 148035</p>
          </div>

          {/* Subject & Salutation */}
          <p className="text-xs mb-2"><span className="font-bold" style={{ color: '#003366' }}>Subject:</span> Medicine Order</p>
          <p className="text-xs mb-3">Dear Sir/Madam,</p>
          <p className="text-xs text-justify mb-4 text-gray-700">
            Kindly provide us the following medicines for our centre Navjeevan Hospital at the below written address at the earliest.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4 text-xs" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#003366' }}>
                <th className="p-2 text-center text-white font-bold border border-gray-300 w-[10%]">Sr.</th>
                <th className="p-2 text-left text-white font-bold border border-gray-300 w-[50%]">Product Name</th>
                <th className="p-2 text-center text-white font-bold border border-gray-300 w-[20%]">Pack</th>
                <th className="p-2 text-center text-white font-bold border border-gray-300 w-[20%]">Qty.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10×10";
                
                return (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                    <td className="border border-gray-300 p-2 font-medium">{item.stockItemName}</td>
                    <td className="border border-gray-300 p-2 text-center">{packing}</td>
                    <td className="border border-gray-300 p-2 text-center font-semibold">{item.quantity} TAB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Flex spacer */}
          <div className="flex-1 min-h-4"></div>

          {/* Footer Section */}
          <div className="mt-auto">
            <p className="text-xs text-gray-700 mb-4">
              <span className="font-bold" style={{ color: '#003366' }}>Address:</span> Navjeevan Hospital, Opp. Bus Stand, Vill. Bara, Sirhind, Distt. Fatehgarh Sahib.
            </p>

            {/* Signature Section */}
            <div className="flex justify-between text-xs px-2">
              <div className="text-left">
                <p className="text-gray-700">Thanking You,</p>
                <p className="text-gray-700 mb-2">Yours Sincerely,</p>
                <div className="mt-10 pt-2 border-t-2 border-gray-500 min-w-[150px]">
                  <span className="font-semibold text-gray-700">{doctorName}</span>
                  <p className="text-gray-600 text-[10px]">Navjeevan Hospital, Sirhind</p>
                </div>
              </div>
              <div className="text-center min-w-[120px]">
                <div className="mt-12 pt-2 border-t-2 border-gray-500">
                  <span className="font-semibold text-gray-700">Date: {formatDate(poDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-[10px] pt-3" style={{ borderTop: '2px solid #003366' }}>
            <p className="font-bold" style={{ color: '#003366' }}>
              NAVJEEVAN HOSPITAL - Opp. Bus Stand, Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
