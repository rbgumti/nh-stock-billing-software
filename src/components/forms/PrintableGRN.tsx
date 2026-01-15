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

        <div ref={printRef} className="p-6 bg-white text-black flex flex-col" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '11pt', lineHeight: '1.5', minHeight: '1123px', height: '1123px' }}>
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

          {/* GRN Title Badge */}
          <div className="flex justify-center mb-4">
            <div className="px-6 py-1.5 rounded-lg text-white font-bold text-sm tracking-wide" style={{ backgroundColor: '#003366' }}>
              GOODS RECEIPT NOTE
            </div>
          </div>

          {/* GRN Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-lg text-xs" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="flex">
              <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>GRN Number:</span>
              <span className="font-semibold">{grnNumber}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>GRN Date:</span>
              <span>{formatDate(grnDateFormatted)}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>PO Number:</span>
              <span>{purchaseOrder.poNumber}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>PO Date:</span>
              <span>{formatDate(purchaseOrder.orderDate)}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>Invoice Number:</span>
              <span>{invoiceNumber || '-'}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[100px]" style={{ color: '#003366' }}>Invoice Date:</span>
              <span>{invoiceDate ? formatDate(invoiceDate) : '-'}</span>
            </div>
          </div>

          {/* Supplier Box */}
          <div className="p-3 mb-4 rounded-lg text-xs" style={{ backgroundColor: '#f0f7ff', border: '2px solid #0066cc' }}>
            <span className="font-bold" style={{ color: '#003366' }}>SUPPLIER: </span>
            <span className="font-semibold">{purchaseOrder.supplier}</span>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4 text-xs" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#003366' }}>
                <th className="p-2 text-center text-white font-bold border border-gray-300 w-[6%]">Sr.</th>
                <th className="p-2 text-left text-white font-bold border border-gray-300 w-[24%]">Item Name</th>
                <th className="p-2 text-center text-white font-bold border border-gray-300 w-[12%]">Batch No.</th>
                <th className="p-2 text-center text-white font-bold border border-gray-300 w-[10%]">Expiry</th>
                <th className="p-2 text-right text-white font-bold border border-gray-300 w-[12%]">Cost Price (Rs.)</th>
                <th className="p-2 text-right text-white font-bold border border-gray-300 w-[12%]">MRP (Rs.)</th>
                <th className="p-2 text-center text-white font-bold border border-gray-300 w-[8%]">Qty</th>
                <th className="p-2 text-right text-white font-bold border border-gray-300 w-[16%]">Total (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {grnItems.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const costPrice = getCostPrice(item.stockItemId);
                const itemTotal = calculateItemTotal(item);
                return (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                    <td className="border border-gray-300 p-2 font-medium">{stockItem?.name || 'Unknown'}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.batchNo || '-'}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.expiryDate ? formatDate(item.expiryDate) : '-'}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatPrecision(costPrice)}</td>
                    <td className="border border-gray-300 p-2 text-right">{item.mrp ? formatPrecision(item.mrp) : '-'}</td>
                    <td className="border border-gray-300 p-2 text-center font-semibold">{item.receivedQuantity}</td>
                    <td className="border border-gray-300 p-2 text-right font-semibold">{Number(itemTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
              {/* Grand Total Row */}
              <tr style={{ backgroundColor: '#003366' }}>
                <td className="border border-gray-300 p-2 text-white font-bold" colSpan={6}>GRAND TOTAL</td>
                <td className="border border-gray-300 p-2 text-center text-white font-bold">{totalReceivedQty}</td>
                <td className="border border-gray-300 p-2 text-right text-white font-bold">{Number(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          {/* Notes Section */}
          {notes && (
            <div className="p-3 mb-4 rounded-lg text-xs" style={{ backgroundColor: '#fffdf0', border: '1px solid #e6d69c' }}>
              <p className="font-bold mb-1" style={{ color: '#8b7700' }}>Notes:</p>
              <p className="text-gray-700">{notes}</p>
            </div>
          )}

          {/* Flex spacer to push content to fill page */}
          <div className="flex-grow min-h-8"></div>

          {/* Signature Section */}
          <div className="mt-auto">
            <div className="flex justify-between text-xs px-2">
              <div className="text-center min-w-[120px]">
                <div className="mt-20 pt-2 border-t-2 border-gray-500">
                  <span className="font-semibold text-gray-700">Received By</span>
                </div>
              </div>
              <div className="text-center min-w-[120px]">
                <div className="mt-20 pt-2 border-t-2 border-gray-500">
                  <span className="font-semibold text-gray-700">Checked By</span>
                </div>
              </div>
              <div className="text-center min-w-[120px]">
                <div className="mt-20 pt-2 border-t-2 border-gray-500">
                  <span className="font-semibold text-gray-700">Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-[10px] pt-3" style={{ borderTop: '2px solid #003366' }}>
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
