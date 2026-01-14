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
  const totalOrderedQty = grnItems.reduce((sum, item) => sum + item.orderedQuantity, 0);
  
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
      // Use html2canvas to capture the preview exactly as rendered
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
      
      // Calculate aspect ratio
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
            body { font-family: 'Times New Roman', Times, serif; padding: 20px; font-size: 12px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header-top { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 5px; }
            .hospital-name { font-size: 22px; font-weight: bold; margin: 5px 0; }
            .hospital-address { font-size: 11px; margin-bottom: 5px; }
            .licence { font-size: 10px; margin-bottom: 10px; }
            .grn-title { font-size: 16px; font-weight: bold; text-decoration: underline; margin: 15px 0; text-align: center; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; font-size: 11px; }
            .info-item { display: flex; }
            .info-label { font-weight: bold; min-width: 120px; }
            .supplier-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
            .supplier-title { font-weight: bold; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10px; }
            th, td { border: 1px solid #000; padding: 5px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .summary-row { font-weight: bold; background-color: #f0f0f0; }
            .notes-section { margin: 15px 0; padding: 10px; border: 1px solid #ccc; }
            .notes-title { font-weight: bold; margin-bottom: 5px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 50px; font-size: 11px; }
            .signature-box { text-align: center; min-width: 150px; }
            .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
            .footer { margin-top: 30px; font-size: 9px; text-align: center; border-top: 1px solid #ccc; padding-top: 10px; }
            @media print {
              body { padding: 10mm; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
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

        <div ref={printRef} className="p-6 bg-white text-black" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
          {/* Header with Logo */}
          <div className="text-center mb-6 pb-4 border-b-4 border-blue-900" style={{ borderBottomStyle: 'double' }}>
            {/* Logo */}
            <div className="flex justify-center mb-3">
              <img 
                src={navjeevanLogo} 
                alt="Navjeevan Hospital Logo" 
                className="w-20 h-20 object-contain"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
              />
            </div>
            
            {/* Hospital Name */}
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#003366', letterSpacing: '2px' }}>
              NAVJEEVAN HOSPITAL
            </h1>
            <p className="text-sm italic text-gray-500 mb-2">Healthcare with Compassion</p>
            
            {/* Address */}
            <p className="text-sm text-gray-700 mb-1">
              Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib (Punjab)
            </p>
            <p className="text-xs text-gray-600">
              Phone: 6284942412 | Dr. Metali Bhatti
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Licence No: PSMHC/Pb./2024/863 | Regd. Govt of Punjab
            </p>
          </div>

          {/* GRN Title Badge */}
          <div className="flex justify-center mb-6">
            <div 
              className="px-8 py-2 rounded-lg text-white font-bold text-lg tracking-wide"
              style={{ backgroundColor: '#003366' }}
            >
              GOODS RECEIPT NOTE
            </div>
          </div>

          {/* GRN Info Grid */}
          <div 
            className="grid grid-cols-2 gap-4 mb-5 p-4 rounded-lg"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="flex">
              <span className="font-bold min-w-[120px]" style={{ color: '#003366' }}>GRN Number:</span>
              <span className="font-semibold">{grnNumber}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[120px]" style={{ color: '#003366' }}>GRN Date:</span>
              <span>{formatDate(grnDateFormatted)}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[120px]" style={{ color: '#003366' }}>PO Number:</span>
              <span>{purchaseOrder.poNumber}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[120px]" style={{ color: '#003366' }}>PO Date:</span>
              <span>{formatDate(purchaseOrder.orderDate)}</span>
            </div>
            {invoiceNumber && (
              <div className="flex">
                <span className="font-bold min-w-[120px]" style={{ color: '#003366' }}>Invoice Number:</span>
                <span>{invoiceNumber}</span>
              </div>
            )}
            {invoiceDate && (
              <div className="flex">
                <span className="font-bold min-w-[120px]" style={{ color: '#003366' }}>Invoice Date:</span>
                <span>{formatDate(invoiceDate)}</span>
              </div>
            )}
          </div>

          {/* Supplier Box */}
          <div 
            className="p-4 mb-5 rounded-lg"
            style={{ backgroundColor: '#f0f7ff', border: '2px solid #0066cc' }}
          >
            <span className="font-bold text-sm" style={{ color: '#003366' }}>SUPPLIER: </span>
            <span className="font-semibold text-gray-800">{purchaseOrder.supplier}</span>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-5 text-xs" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#003366' }}>
                <th className="p-2 text-left text-white font-bold border border-gray-300">Sr.</th>
                <th className="p-2 text-left text-white font-bold border border-gray-300">Item Name</th>
                <th className="p-2 text-left text-white font-bold border border-gray-300">Batch No.</th>
                <th className="p-2 text-left text-white font-bold border border-gray-300">Expiry</th>
                <th className="p-2 text-right text-white font-bold border border-gray-300">Cost Price (₹)</th>
                <th className="p-2 text-right text-white font-bold border border-gray-300">MRP (₹)</th>
                <th className="p-2 text-right text-white font-bold border border-gray-300">Qty</th>
                <th className="p-2 text-right text-white font-bold border border-gray-300">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {grnItems.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const costPrice = getCostPrice(item.stockItemId);
                const itemTotal = calculateItemTotal(item);
                return (
                  <tr 
                    key={index} 
                    style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}
                  >
                    <td className="border border-gray-300 p-2">{index + 1}</td>
                    <td className="border border-gray-300 p-2 font-medium">{stockItem?.name || 'Unknown'}</td>
                    <td className="border border-gray-300 p-2">{item.batchNo || '-'}</td>
                    <td className="border border-gray-300 p-2">{item.expiryDate ? formatDate(item.expiryDate) : '-'}</td>
                    <td className="border border-gray-300 p-2 text-right">₹{formatPrecision(costPrice)}</td>
                    <td className="border border-gray-300 p-2 text-right">{item.mrp ? `₹${formatPrecision(item.mrp)}` : '-'}</td>
                    <td className="border border-gray-300 p-2 text-right font-semibold">{item.receivedQuantity}</td>
                    <td className="border border-gray-300 p-2 text-right font-semibold">₹{formatPrecision(itemTotal)}</td>
                  </tr>
                );
              })}
              {/* Summary Row */}
              <tr style={{ backgroundColor: '#003366' }}>
                <td className="border border-gray-300 p-2 text-white font-bold" colSpan={6}>GRAND TOTAL</td>
                <td className="border border-gray-300 p-2 text-right text-white font-bold">{totalReceivedQty}</td>
                <td className="border border-gray-300 p-2 text-right text-white font-bold">₹{formatPrecision(grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* Notes Section */}
          {notes && (
            <div 
              className="p-4 mb-5 rounded-lg"
              style={{ backgroundColor: '#fffdf0', border: '1px solid #e6d69c' }}
            >
              <p className="font-bold mb-1" style={{ color: '#8b7700' }}>📝 Notes:</p>
              <p className="text-sm text-gray-700">{notes}</p>
            </div>
          )}

          {/* Signature Section */}
          <div className="flex justify-between mt-16 text-sm px-4">
            <div className="text-center min-w-[140px]">
              <div className="border-t-2 border-gray-500 mt-10 pt-2">
                <span className="font-semibold text-gray-700">Received By</span>
              </div>
            </div>
            <div className="text-center min-w-[140px]">
              <div className="border-t-2 border-gray-500 mt-10 pt-2">
                <span className="font-semibold text-gray-700">Checked By</span>
              </div>
            </div>
            <div className="text-center min-w-[140px]">
              <div className="border-t-2 border-gray-500 mt-10 pt-2">
                <span className="font-semibold text-gray-700">Authorized Signatory</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div 
            className="mt-10 text-center text-xs pt-4"
            style={{ borderTop: '2px solid #003366' }}
          >
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
