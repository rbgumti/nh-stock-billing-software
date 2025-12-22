import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";

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
  invoiceNumber, 
  invoiceDate, 
  purchaseOrder, 
  grnItems, 
  stockItems,
  notes,
  onClose 
}: PrintableGRNProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  const getStockItemDetails = (stockItemId: number) => {
    return stockItems.find(item => item.id === stockItemId);
  };

  const totalReceivedQty = grnItems.reduce((sum, item) => sum + item.receivedQuantity, 0);
  const totalOrderedQty = grnItems.reduce((sum, item) => sum + item.orderedQuantity, 0);

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
            <Button onClick={handlePrint} size="sm" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-4 bg-white text-black" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
          {/* Header */}
          <div className="text-center mb-4 border-b-2 border-black pb-3">
            <div className="flex justify-between text-xs mb-2">
              <span>Regd. Govt of Punjab</span>
              <span>Mob_ 6284942412</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">NAVJEEVAN HOSPITAL</h1>
            <p className="text-sm mb-1">Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;Dr.metali Bhatti</p>
            <p className="text-xs">Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024</p>
          </div>

          {/* GRN Title */}
          <h2 className="text-lg font-bold underline text-center my-4">GOODS RECEIPT NOTE</h2>

          {/* GRN Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div className="flex">
              <span className="font-bold min-w-[120px]">GRN Number:</span>
              <span>{grnNumber}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[120px]">GRN Date:</span>
              <span>{formatDate(new Date().toISOString())}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[120px]">PO Number:</span>
              <span>{purchaseOrder.poNumber}</span>
            </div>
            <div className="flex">
              <span className="font-bold min-w-[120px]">PO Date:</span>
              <span>{formatDate(purchaseOrder.orderDate)}</span>
            </div>
            {invoiceNumber && (
              <div className="flex">
                <span className="font-bold min-w-[120px]">Invoice Number:</span>
                <span>{invoiceNumber}</span>
              </div>
            )}
            {invoiceDate && (
              <div className="flex">
                <span className="font-bold min-w-[120px]">Invoice Date:</span>
                <span>{formatDate(invoiceDate)}</span>
              </div>
            )}
          </div>

          {/* Supplier Box */}
          <div className="border border-black p-3 mb-4">
            <p className="font-bold mb-1">Supplier Details:</p>
            <p className="text-sm">{purchaseOrder.supplier}</p>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4 text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left">Sr.</th>
                <th className="border border-black p-2 text-left">Item Name</th>
                <th className="border border-black p-2 text-left">Batch No.</th>
                <th className="border border-black p-2 text-left">Expiry Date</th>
                <th className="border border-black p-2 text-right">MRP (₹)</th>
                <th className="border border-black p-2 text-right">Ordered Qty</th>
                <th className="border border-black p-2 text-right">Received Qty</th>
                <th className="border border-black p-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {grnItems.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                return (
                  <tr key={index}>
                    <td className="border border-black p-2">{index + 1}</td>
                    <td className="border border-black p-2">{stockItem?.name || 'Unknown'}</td>
                    <td className="border border-black p-2">{item.batchNo || '-'}</td>
                    <td className="border border-black p-2">{item.expiryDate ? formatDate(item.expiryDate) : '-'}</td>
                    <td className="border border-black p-2 text-right">{item.mrp ? `₹${item.mrp.toFixed(2)}` : '-'}</td>
                    <td className="border border-black p-2 text-right">{item.orderedQuantity}</td>
                    <td className="border border-black p-2 text-right">{item.receivedQuantity}</td>
                    <td className="border border-black p-2">{item.remarks || '-'}</td>
                  </tr>
                );
              })}
              {/* Summary Row */}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-black p-2" colSpan={5}>TOTAL</td>
                <td className="border border-black p-2 text-right">{totalOrderedQty}</td>
                <td className="border border-black p-2 text-right">{totalReceivedQty}</td>
                <td className="border border-black p-2"></td>
              </tr>
            </tbody>
          </table>

          {/* Notes Section */}
          {notes && (
            <div className="border border-gray-400 p-3 mb-4">
              <p className="font-bold mb-1">Notes:</p>
              <p className="text-sm">{notes}</p>
            </div>
          )}

          {/* Signature Section */}
          <div className="flex justify-between mt-12 text-sm">
            <div className="text-center min-w-[150px]">
              <div className="border-t border-black mt-10 pt-1">
                Received By
              </div>
            </div>
            <div className="text-center min-w-[150px]">
              <div className="border-t border-black mt-10 pt-1">
                Checked By
              </div>
            </div>
            <div className="text-center min-w-[150px]">
              <div className="border-t border-black mt-10 pt-1">
                Authorized Signatory
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs border-t border-gray-400 pt-3">
            <p>This is a computer generated document. For queries contact: 6284942412</p>
            <p className="mt-1">NAVJEEVAN HOSPITAL - Opp. Bus Stand, Bara Sirhind, Distt. Fatehgarh Sahib (Pb.)</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
