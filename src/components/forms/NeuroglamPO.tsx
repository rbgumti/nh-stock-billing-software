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

interface NeuroglamPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function NeuroglamPO({ poNumber, poDate, items, stockItems, onClose }: NeuroglamPOProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { doctorName } = useAppSettings();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  const getMonthYear = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${month} ${year}`;
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
      pdf.save(`PO-${sanitizedPONumber}-Neuroglam.pdf`);
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
            <span>Neuroglam Purchase Order Format</span>
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

        <div ref={printRef} className="p-6 bg-white text-black flex flex-col" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '13pt', lineHeight: '1.6', fontWeight: '600', minHeight: '1123px', height: '1123px' }}>
          {/* Header with Logo */}
          <div className="text-center mb-4 pb-3 border-b-4" style={{ borderBottomStyle: 'double', borderColor: '#003366' }}>
            <div className="flex justify-center mb-2">
              <img src={navjeevanLogo} alt="Logo" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-3xl font-black tracking-wide" style={{ color: '#003366', letterSpacing: '1px' }}>
              NAVJEEVAN HOSPITAL
            </h1>
            <p className="text-sm font-bold italic text-gray-700 mt-1">Healthcare with Compassion</p>
            <p className="text-sm font-bold text-gray-800 mt-1">
              Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
            <p className="text-xs font-bold text-gray-700 mt-0.5">Phone: 6284942412 | {doctorName}</p>
            <p className="text-xs font-bold text-gray-700">Licence No: PSMHC/Pb./2024/863 | Regd. Govt of Punjab</p>
          </div>

          {/* PO Title Badge */}
          <div className="flex justify-center mb-4">
            <div className="px-8 py-2.5 rounded-lg text-white font-black text-lg tracking-widest shadow-md" style={{ backgroundColor: '#003366' }}>
              PURCHASE ORDER
            </div>
          </div>

          {/* PO Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 p-4 rounded-lg text-base font-bold" style={{ backgroundColor: '#f0f7ff', border: '2px solid #003366' }}>
            <div className="flex">
              <span className="font-black min-w-[110px]" style={{ color: '#003366' }}>PO Number:</span>
              <span className="font-black text-gray-900">{poNumber}</span>
            </div>
            <div className="flex">
              <span className="font-black min-w-[110px]" style={{ color: '#003366' }}>PO Date:</span>
              <span className="font-bold text-gray-900">{formatDate(poDate)}</span>
            </div>
          </div>

          {/* Supplier Box */}
          <div className="p-4 mb-4 rounded-lg text-base" style={{ backgroundColor: '#e8f4fd', border: '2px solid #0066cc' }}>
            <span className="font-black" style={{ color: '#003366' }}>TO: </span>
            <span className="font-black text-gray-900">NEUROGLAM</span>
            <p className="text-gray-800 font-bold mt-1">Village – Ajnoud, Tehsil – Payal, Ludhiana – 141421 (Punjab)</p>
          </div>

          {/* Subject & Salutation */}
          <p className="text-base font-bold mb-2"><span className="font-black" style={{ color: '#003366' }}>Subject:</span> <span className="text-gray-900">Purchase Order</span></p>
          <p className="text-base font-bold mb-3 text-gray-900">Dear Sir/Madam,</p>
          <p className="text-base font-semibold text-justify mb-4 text-gray-800">
            We hereby placing a purchase order with Stamp and Sign of our current working doctor's. Terms and Conditions will remain same as our discussion telephonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4 text-base" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#003366' }}>
                <th className="p-3 text-center text-white font-black border-2 border-gray-400 w-[6%]">Sr.</th>
                <th className="p-3 text-left text-white font-black border-2 border-gray-400 w-[18%]">Product</th>
                <th className="p-3 text-left text-white font-black border-2 border-gray-400 w-[36%]">Compositions</th>
                <th className="p-3 text-center text-white font-black border-2 border-gray-400 w-[12%]">Pack</th>
                <th className="p-3 text-center text-white font-black border-2 border-gray-400 w-[14%]">Strips</th>
                <th className="p-3 text-center text-white font-black border-2 border-gray-400 w-[14%]">Tablets</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = item.packSize || stockItem?.packing || "10×10";
                const qtyInStrips = item.qtyInStrips || item.quantity;
                const qtyInTabs = item.qtyInTabs || qtyInStrips * 10;
                
                return (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f0f7ff' }}>
                    <td className="border-2 border-gray-400 p-3 text-center font-bold text-gray-900">{index + 1}</td>
                    <td className="border-2 border-gray-400 p-3 font-black text-gray-900">{item.stockItemName}</td>
                    <td className="border-2 border-gray-400 p-3 font-bold text-gray-800">{stockItem?.composition || '-'}</td>
                    <td className="border-2 border-gray-400 p-3 text-center font-bold text-gray-800">{packing}</td>
                    <td className="border-2 border-gray-400 p-3 text-center font-black text-gray-900">{qtyInStrips.toLocaleString()}</td>
                    <td className="border-2 border-gray-400 p-3 text-center font-black text-gray-900">{qtyInTabs.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Flex spacer to push content to fill page */}
          <div className="flex-grow"></div>

          {/* Undertaking */}
          <div className="mt-auto">
            <p className="font-black text-base mb-1" style={{ color: '#003366' }}>UNDERTAKING:</p>
            <p className="text-sm font-semibold text-justify leading-relaxed text-gray-800">
              We confirm purchase of Buprenorphine products from Neuroglam, Village Ajnoud, Tehsil Payal, Ludhiana – 141421 (Punjab), under P.O. No. {poNumber.replace('NH/PO-', '')} dated {formatDate(poDate)} ({getMonthYear(poDate)}). Products will be supplied exclusively to De-Addiction Centres and qualified doctors under License No. PSMHC/Punjab/2024/863. We are aware these are controlled substances per NDPS Act, 1985, and shall maintain all statutory records. Form-6 (Consignment Note) will be issued upon delivery. Products are for formulations/sales within India only, not for retail counter sale or export. Neuroglam shall not be liable for any non-compliance by us.
            </p>

            <div className="flex-grow min-h-16"></div>

            {/* Signature Section */}
            <div className="flex justify-between text-base px-2">
              <div className="text-left">
                <p className="font-black" style={{ color: '#003366' }}>For Navjeevan Hospital,</p>
                <p className="text-gray-800 font-bold text-sm">Opp. New Bus Stand, G.T. Road, Sirhind</p>
                <div className="mt-24 pt-3 border-t-2 border-gray-600 min-w-[220px]">
                  <span className="font-black text-gray-900 text-lg">{doctorName}</span>
                  <p className="text-gray-700 text-sm font-bold">Navjeevan Hospital, Sirhind</p>
                  <p className="text-gray-600 text-xs font-semibold italic mt-1">(Signature & Stamp)</p>
                </div>
              </div>
              <div className="text-center min-w-[160px]">
                <div className="mt-24 pt-3 border-t-2 border-gray-600">
                  <span className="font-black text-gray-900 text-lg">Date: {formatDate(poDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm font-black pt-3" style={{ borderTop: '3px solid #003366' }}>
            <p style={{ color: '#003366' }}>
              NAVJEEVAN HOSPITAL - Opp. Bus Stand, Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
