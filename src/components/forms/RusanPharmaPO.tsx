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
      pdf.save(`PO-${sanitizedPONumber}-Rusan-Pharma.pdf`);
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

        <div ref={printRef} className="p-6 bg-white text-black flex flex-col" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '14pt', lineHeight: '1.5', fontWeight: '600', height: '1123px' }}>
          {/* Header with Logo */}
          <div className="text-center mb-3 pb-3 border-b-4" style={{ borderBottomStyle: 'double', borderColor: '#003366' }}>
            <div className="flex justify-center mb-2">
              <img src={navjeevanLogo} alt="Logo" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-3xl font-black tracking-wide" style={{ color: '#003366', letterSpacing: '1px' }}>
              NAVJEEVAN HOSPITAL
            </h1>
            <p className="text-sm font-bold italic text-gray-700">Healthcare with Compassion</p>
            <p className="text-sm font-bold text-gray-800">
              Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
            <p className="text-sm font-bold text-gray-700">Phone: 6284942412 | {doctorName} | Licence No: PSMHC/Pb./2024/863</p>
          </div>

          {/* PO Title Badge */}
          <div className="flex justify-center mb-3">
            <div className="px-8 py-2 rounded-lg text-white font-black text-lg tracking-widest shadow-md" style={{ backgroundColor: '#003366' }}>
              PURCHASE ORDER
            </div>
          </div>

          {/* PO Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3 p-3 rounded-lg text-base font-bold" style={{ backgroundColor: '#f0f7ff', border: '2px solid #003366' }}>
            <div className="flex">
              <span className="font-black min-w-[110px]" style={{ color: '#003366' }}>PO Number:</span>
              <span className="font-black text-gray-900">NH-25-26-{getPONumberSuffix()}</span>
            </div>
            <div className="flex">
              <span className="font-black min-w-[110px]" style={{ color: '#003366' }}>PO Date:</span>
              <span className="font-bold text-gray-900">{formatDate(poDate)}</span>
            </div>
          </div>

          {/* Supplier Box */}
          <div className="p-3 mb-3 rounded-lg text-base" style={{ backgroundColor: '#e8f4fd', border: '2px solid #0066cc' }}>
            <span className="font-black" style={{ color: '#003366' }}>TO: </span>
            <span className="font-black text-gray-900">RUSAN PHARMA LTD.</span>
            <span className="text-gray-800 font-bold ml-2">Khasra No. 122MI, Central Hope Town, Selaqui, Dehradun, Uttarakhand - 248197</span>
          </div>

          {/* Subject & Salutation */}
          <p className="text-base font-bold mb-1"><span className="font-black" style={{ color: '#003366' }}>Subject:</span> <span className="text-gray-900">Purchase Order</span></p>
          <p className="text-base font-bold mb-2 text-gray-900">Dear Sir/Madam,</p>
          <p className="text-base font-semibold text-justify mb-3 text-gray-800">
            We place a purchase order with authorized doctor's stamp and signature. Terms per telephone discussion. Payment by cheque to your bank account.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-3 text-base" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#003366' }}>
                <th className="p-2.5 text-center text-white font-black border border-gray-400 w-[6%]">Sr.</th>
                <th className="p-2.5 text-left text-white font-black border border-gray-400 w-[18%]">Product</th>
                <th className="p-2.5 text-left text-white font-black border border-gray-400 w-[36%]">Compositions</th>
                <th className="p-2.5 text-center text-white font-black border border-gray-400 w-[12%]">Pack</th>
                <th className="p-2.5 text-center text-white font-black border border-gray-400 w-[14%]">Strips</th>
                <th className="p-2.5 text-center text-white font-black border border-gray-400 w-[14%]">Tablets</th>
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
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f0f7ff' }}>
                    <td className="border border-gray-400 p-2.5 text-center font-bold text-gray-900">{index + 1}</td>
                    <td className="border border-gray-400 p-2.5 font-black text-gray-900">{item.stockItemName}</td>
                    <td className="border border-gray-400 p-2.5 font-bold text-gray-800">{stockItem?.composition || '-'}</td>
                    <td className="border border-gray-400 p-2.5 text-center font-bold text-gray-800">{packing.replace('*', '×')}</td>
                    <td className="border border-gray-400 p-2.5 text-center font-black text-gray-900">{qtyInStrips.toLocaleString()}</td>
                    <td className="border border-gray-400 p-2.5 text-center font-black text-gray-900">{qtyInTabs.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Undertaking */}
          <div className="mt-2">
            <p className="font-black text-base mb-1" style={{ color: '#003366' }}>UNDERTAKING:</p>
            <p className="text-sm font-semibold text-justify leading-snug text-gray-800">
              We hereby confirm that the product which we intend to buy from RUSAN PHARMA LTD. KHASRA NO. 122MI, CENTRAL HOPE TOWN, SELAQUI, DEHRADUN, UTTARAKHAND-248197 Our P.O. No: {getPONumberSuffix()}/A ({formatDate(poDate)}). These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our License No. PSMHC/Punjab/2024/863 we are fully aware These product containing controlled substances as per Narcotic Drugs & Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6 (Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation & for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any non-compliance of statutory provisions committed by us intentionally or un-intentionally.
            </p>
          </div>

          {/* Signature Section */}
          <div className="mt-3 flex justify-between text-base px-2">
            <div className="text-left">
              <p className="font-black text-base" style={{ color: '#003366' }}>For Navjeevan Hospital,</p>
              <p className="text-gray-800 font-bold text-sm">Opp. New Bus Stand, G.T. Road, Sirhind</p>
              <div className="min-h-[70px]"></div>
              <div className="pt-1 border-t-2 border-gray-600 min-w-[220px]">
                <span className="font-black text-gray-900 text-lg">{doctorName}</span>
                <p className="text-gray-700 text-sm font-bold">Navjeevan Hospital, Sirhind</p>
                <p className="text-gray-600 text-xs font-semibold italic">(Signature & Stamp)</p>
              </div>
            </div>
            <div className="text-center min-w-[150px]">
              <div className="min-h-[70px]"></div>
              <div className="pt-1 border-t-2 border-gray-600 mt-auto">
                <span className="font-black text-gray-900 text-lg">Date: {formatDate(poDate)}</span>
              </div>
            </div>
          </div>

          {/* Flex spacer to push footer to bottom */}
          <div className="flex-grow"></div>

          {/* Footer */}
          <div className="mt-3 text-center text-sm font-black pt-2" style={{ borderTop: '3px solid #003366' }}>
            <p style={{ color: '#003366' }}>
              NAVJEEVAN HOSPITAL - Opp. Bus Stand, Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
