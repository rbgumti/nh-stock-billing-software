import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import navjeevanLogo from "@/assets/NH_LOGO.png";
import { formatPrecision } from "@/lib/formatUtils";
import { useAppSettings } from "@/hooks/usePerformanceMode";

interface GRNItem {
  stockItemId: number;
  orderedQuantity: number;
  receivedQuantity: number;
  batchNo?: string;
  expiryDate?: string;
  mrp?: number;
  remarks?: string;
}

interface PrintableGRNProps {
  grnNumber: string;
  grnDate?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  purchaseOrder: PurchaseOrder;
  grnItems: GRNItem[];
  stockItems: StockItem[];
  notes?: string;
  onClose: () => void;
}

export function PrintableGRN({ 
  grnNumber, 
  grnDate,
  invoiceNumber, 
  invoiceDate, 
  purchaseOrder, 
  grnItems, 
  stockItems,
  notes,
  onClose 
}: PrintableGRNProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { doctorName } = useAppSettings();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  const getStockItemDetails = (stockItemId: number) => {
    return stockItems.find(item => item.id === stockItemId);
  };

  // Get cost price from PO items
  const getCostPrice = (stockItemId: number) => {
    const poItem = purchaseOrder.items.find(item => item.stockItemId === stockItemId);
    return poItem?.unitPrice || 0;
  };

  const totalReceivedQty = grnItems.reduce((sum, item) => sum + item.receivedQuantity, 0);
  
  // Calculate total amount based on received quantity and cost price
  const calculateItemTotal = (item: GRNItem) => {
    const costPrice = getCostPrice(item.stockItemId);
    return item.receivedQuantity * costPrice;
  };
  
  const grandTotal = grnItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const grnDateFormatted = grnDate || new Date().toISOString().split('T')[0];

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`GRN-${grnNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
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
          <title>GRN - ${grnNumber}</title>
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Goods Receipt Note Preview</span>
            <div className="flex gap-2">
              <Button onClick={handleDownloadPDF} size="sm" variant="outline" className="flex items-center gap-2" disabled={isGenerating}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isGenerating ? 'Generating...' : 'Download PDF'}
              </Button>
              <Button onClick={handlePrint} size="sm" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-8 bg-white text-black flex flex-col" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '11pt', lineHeight: '1.5', minHeight: '1123px', height: '1123px' }}>
          {/* Header with Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img src={navjeevanLogo} alt="Logo" className="w-20 h-20 object-contain" />
            </div>
            <h1 className="text-3xl font-bold mb-1 tracking-wide" style={{ color: '#003366' }}>
              NAVJEEVAN HOSPITAL
            </h1>
            <p className="text-sm italic text-gray-500 mb-2">Healthcare with Compassion</p>
            <p className="text-sm text-gray-700 mb-1">
              Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
            <p className="text-sm text-gray-600 mb-1">Phone: 6284942412 | {doctorName}</p>
            <p className="text-sm text-gray-500">Licence No: PSMHC/Pb./2024/863 | Regd. Govt of Punjab</p>
          </div>

          {/* Navy Blue Divider Line */}
          <div className="w-full h-1 mb-6" style={{ backgroundColor: '#003366' }}></div>

          {/* GRN Title Badge */}
          <div className="flex justify-center mb-6">
            <div className="px-8 py-2 rounded-full text-white font-bold text-base tracking-wide" style={{ backgroundColor: '#0078d4' }}>
              GOODS RECEIPT NOTE
            </div>
          </div>

          {/* GRN Info Grid - Rounded Box */}
          <div className="mb-6 p-5 rounded-xl" style={{ border: '1px solid #e5e7eb' }}>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div className="flex">
                <span className="font-bold min-w-[120px]" style={{ color: '#003366' }}>GRN Number:</span>
                <span className="font-medium">{grnNumber}</span>
              </div>
              <div className="flex">
                <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>GRN Date:</span>
                <span>{formatDate(grnDateFormatted)}</span>
              </div>
              <div className="flex">
                <span className="font-bold min-w-[120px]" style={{ color: '#003366' }}>PO Number:</span>
                <span>{purchaseOrder.poNumber}</span>
              </div>
              <div className="flex">
                <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>PO Date:</span>
                <span>{formatDate(purchaseOrder.orderDate)}</span>
              </div>
              <div className="flex col-span-2">
                <span className="font-bold min-w-[120px]" style={{ color: '#003366' }}>Invoice Date:</span>
                <span>{invoiceDate ? formatDate(invoiceDate) : '-'}</span>
              </div>
            </div>
          </div>

          {/* Supplier Box - Rounded */}
          <div className="p-4 mb-6 rounded-xl text-sm" style={{ backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <span className="font-bold" style={{ color: '#0078d4' }}>SUPPLIER: </span>
            <span className="font-medium">{purchaseOrder.supplier}</span>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-6 text-sm">
            <thead>
              <tr style={{ backgroundColor: '#003366' }}>
                <th className="p-3 text-center text-white font-bold border border-gray-300 w-[6%]">Sr.</th>
                <th className="p-3 text-left text-white font-bold border border-gray-300 w-[24%]">Item Name</th>
                <th className="p-3 text-center text-white font-bold border border-gray-300 w-[12%]">Batch No.</th>
                <th className="p-3 text-center text-white font-bold border border-gray-300 w-[10%]">Expiry</th>
                <th className="p-3 text-right text-white font-bold border border-gray-300 w-[12%]">Cost Price (₹)</th>
                <th className="p-3 text-right text-white font-bold border border-gray-300 w-[12%]">MRP (₹)</th>
                <th className="p-3 text-center text-white font-bold border border-gray-300 w-[8%]">Qty</th>
                <th className="p-3 text-right text-white font-bold border border-gray-300 w-[16%]">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {grnItems.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const costPrice = getCostPrice(item.stockItemId);
                const itemTotal = calculateItemTotal(item);
                return (
                  <tr key={index} style={{ backgroundColor: '#ffffff' }}>
                    <td className="border border-gray-300 p-3 text-center">{index + 1}</td>
                    <td className="border border-gray-300 p-3 font-medium">{stockItem?.name || 'Unknown'}</td>
                    <td className="border border-gray-300 p-3 text-center">{item.batchNo || '-'}</td>
                    <td className="border border-gray-300 p-3 text-center">{item.expiryDate ? formatDate(item.expiryDate) : '-'}</td>
                    <td className="border border-gray-300 p-3 text-right">₹{formatPrecision(costPrice)}</td>
                    <td className="border border-gray-300 p-3 text-right">{item.mrp ? `₹${formatPrecision(item.mrp)}` : '-'}</td>
                    <td className="border border-gray-300 p-3 text-center font-semibold">{item.receivedQuantity}</td>
                    <td className="border border-gray-300 p-3 text-right font-semibold">₹{Number(itemTotal).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  </tr>
                );
              })}
              {/* Grand Total Row */}
              <tr style={{ backgroundColor: '#003366' }}>
                <td className="border border-gray-300 p-3 text-white font-bold" colSpan={6}>GRAND TOTAL</td>
                <td className="border border-gray-300 p-3 text-center text-white font-bold">{totalReceivedQty}</td>
                <td className="border border-gray-300 p-3 text-right text-white font-bold">₹{Number(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              </tr>
            </tbody>
          </table>

          {/* Notes Section */}
          {notes && (
            <div className="p-4 mb-6 rounded-lg text-sm" style={{ backgroundColor: '#fffdf0', border: '1px solid #e6d69c' }}>
              <p className="font-bold mb-1" style={{ color: '#8b7700' }}>Notes:</p>
              <p className="text-gray-700">{notes}</p>
            </div>
          )}

          {/* Flex spacer to push signature and footer to bottom */}
          <div className="flex-grow min-h-12"></div>

          {/* Signature Section */}
          <div className="mb-8">
            <div className="flex justify-between text-sm px-4">
              <div className="text-center min-w-[140px]">
                <div className="w-32 h-0 border-t border-gray-800 mb-2"></div>
                <span className="text-gray-700">Received By</span>
              </div>
              <div className="text-center min-w-[140px]">
                <div className="w-32 h-0 border-t border-gray-800 mb-2"></div>
                <span className="text-gray-700">Checked By</span>
              </div>
              <div className="text-center min-w-[140px]">
                <div className="w-32 h-0 border-t border-gray-800 mb-2"></div>
                <span className="text-gray-700">Authorized Signatory</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
            <p className="text-gray-500 mb-1">
              This is a computer generated document | For queries contact: 6284942412
            </p>
            <p className="font-bold" style={{ color: '#003366' }}>
              NAVJEEVAN HOSPITAL - Opp. Bus Stand, Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
