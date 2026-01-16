import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import { useAppSettings } from "@/hooks/usePerformanceMode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import navjeevanLogo from "@/assets/NH_LOGO.png";

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
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

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

        <div ref={printRef} className="p-6 bg-white text-black flex flex-col" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '12pt', lineHeight: '1.5', fontWeight: '500', minHeight: '1123px', height: '1123px' }}>
          {/* Header with Logo */}
          <div className="text-center mb-4 pb-3 border-b-4" style={{ borderBottomStyle: 'double', borderColor: '#003366' }}>
            <div className="flex justify-center mb-2">
              <img src={navjeevanLogo} alt="Logo" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold mb-1" style={{ color: '#003366', letterSpacing: '1px' }}>
              NAVJEEVAN HOSPITAL
            </h1>
            <p className="text-xs font-medium italic text-gray-600 mb-1">Healthcare with Compassion</p>
            <p className="text-xs font-medium text-gray-700 mb-1">
              Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
            <p className="text-xs font-medium text-gray-600">Phone: 6284942412 | {doctorName}</p>
            <p className="text-xs font-medium text-gray-600">Licence No: PSMHC/Pb./2024/863 | Regd. Govt of Punjab</p>
          </div>

          {/* PO Title Badge */}
          <div className="flex justify-center mb-4">
            <div className="px-6 py-2 rounded-lg text-white font-extrabold text-base tracking-wide" style={{ backgroundColor: '#003366' }}>
              PURCHASE ORDER
            </div>
          </div>

          {/* PO Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="flex">
              <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>PO Number:</span>
              <span className="font-bold">NH-25-26-{getPONumberSuffix()}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>PO Date:</span>
              <span className="font-semibold">{formatDate(poDate)}</span>
            </div>
          </div>

          {/* Supplier Box */}
          <div className="p-3 mb-4 rounded-lg text-sm" style={{ backgroundColor: '#f0f7ff', border: '2px solid #0066cc' }}>
            <span className="font-bold" style={{ color: '#003366' }}>TO: </span>
            <span className="font-bold">RUSAN PHARMA LTD.</span>
            <p className="text-gray-700 font-medium mt-1">Khasra No. 122MI, Central Hope Town, Selaqui, Dehradun, Uttarakhand - 248197</p>
          </div>

          {/* Subject & Salutation */}
          <p className="text-sm font-medium mb-2"><span className="font-bold" style={{ color: '#003366' }}>Subject:</span> Purchase Order</p>
          <p className="text-sm font-medium mb-3">Dear Sir/Madam,</p>
          <p className="text-sm font-medium text-justify mb-4 text-gray-700">
            We place a purchase order with authorized doctor's stamp and signature. Terms per telephone discussion. Payment by cheque to your bank account.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4 text-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#003366' }}>
                <th className="p-2.5 text-center text-white font-extrabold border border-gray-300 w-[6%]">Sr.</th>
                <th className="p-2.5 text-left text-white font-extrabold border border-gray-300 w-[18%]">Product</th>
                <th className="p-2.5 text-left text-white font-extrabold border border-gray-300 w-[36%]">Compositions</th>
                <th className="p-2.5 text-center text-white font-extrabold border border-gray-300 w-[12%]">Pack</th>
                <th className="p-2.5 text-center text-white font-extrabold border border-gray-300 w-[14%]">Strips</th>
                <th className="p-2.5 text-center text-white font-extrabold border border-gray-300 w-[14%]">Tablets</th>
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
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td className="border border-gray-300 p-2.5 text-center font-semibold">{index + 1}</td>
                    <td className="border border-gray-300 p-2.5 font-bold">{item.stockItemName}</td>
                    <td className="border border-gray-300 p-2.5 font-medium">{stockItem?.composition || '-'}</td>
                    <td className="border border-gray-300 p-2.5 text-center font-semibold">{packing.replace('*', '×')}</td>
                    <td className="border border-gray-300 p-2.5 text-center font-bold">{qtyInStrips.toLocaleString()}</td>
                    <td className="border border-gray-300 p-2.5 text-center font-bold">{qtyInTabs.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Flex spacer to push content to fill page */}
          <div className="flex-grow"></div>

          {/* Undertaking */}
          <div className="mt-auto">
            <p className="font-bold text-sm mb-1" style={{ color: '#003366' }}>UNDERTAKING:</p>
            <p className="text-xs font-medium text-justify leading-relaxed text-gray-700">
              We confirm purchase from Rusan Pharma Ltd. under P.O. No. {getPONumberSuffix()}/A ({formatDate(poDate)}). These controlled substances per Narcotic Drugs and Psychotropic Substances Act, 1985, shall be maintained with full records. Form-6 (Consignment Note) will be submitted upon receipt. Products are exclusively for our De-addiction Centre and qualified doctors only, licensed under PSMHC/Punjab/2024/863, sales within India only, no retail or export. Rusan Pharma Ltd. not liable for non-compliance by us.
            </p>

            <div className="flex-grow min-h-16"></div>

            {/* Signature Section */}
            <div className="flex justify-between text-sm px-2">
              <div className="text-left">
                <p className="font-bold" style={{ color: '#003366' }}>For Navjeevan Hospital,</p>
                <p className="text-gray-700 font-medium text-xs">Opp. New Bus Stand, G.T. Road, Sirhind</p>
                <div className="mt-20 pt-2 border-t-2 border-gray-500 min-w-[180px]">
                  <span className="font-bold text-gray-800">{doctorName}</span>
                  <p className="text-gray-600 text-xs font-medium">Navjeevan Hospital, Sirhind</p>
                  <p className="text-gray-500 text-[10px] italic mt-1">(Signature & Stamp)</p>
                </div>
              </div>
              <div className="text-center min-w-[140px]">
                <div className="mt-20 pt-2 border-t-2 border-gray-500">
                  <span className="font-bold text-gray-800">Date: {formatDate(poDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs font-bold pt-3" style={{ borderTop: '2px solid #003366' }}>
            <p style={{ color: '#003366' }}>
              NAVJEEVAN HOSPITAL - Opp. Bus Stand, Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
