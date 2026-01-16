import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import type { PurchaseOrder } from "@/hooks/usePurchaseOrderStore";
import type { StockItem } from "@/hooks/useStockStore";
import { GRNDocument, type GRNItem } from "@/components/forms/GRNDocument";

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
  onClose,
}: PrintableGRNProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`GRN-${grnNumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
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
              <Button
                onClick={handleDownloadPDF}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isGenerating ? "Generating..." : "Download PDF"}
              </Button>
              <Button onClick={handlePrint} size="sm" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <GRNDocument
          ref={printRef}
          grnNumber={grnNumber}
          grnDate={grnDate}
          invoiceNumber={invoiceNumber}
          invoiceDate={invoiceDate}
          purchaseOrder={purchaseOrder}
          grnItems={grnItems}
          stockItems={stockItems}
          notes={notes}
        />
      </DialogContent>
    </Dialog>
  );
}
