import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAppSettings } from "@/hooks/usePerformanceMode";

interface ParbPharmaPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function ParbPharmaPO({ poNumber, poDate, items, stockItems, onClose }: ParbPharmaPOProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { doctorName } = useAppSettings();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' }).replace(/\//g, '-');
  };

  const getStockItemDetails = (stockItemId: number) => {
    return stockItems.find(item => item.id === stockItemId);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printHTML = printContent.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${poNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { 
              size: A4; 
              margin: 10mm 12mm;
            }
            html, body { 
              height: 100%; 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 11pt; 
              line-height: 1.4;
            }
            body { 
              padding: 0;
              display: flex;
              flex-direction: column;
              min-height: 100vh;
            }
            .content-wrapper {
              flex: 1;
              display: flex;
              flex-direction: column;
            }
            .header-row { text-align: center; font-size: 11pt; margin-bottom: 6px; }
            .hospital-name { font-size: 24pt; font-weight: bold; text-align: center; margin: 8px 0; }
            .address-row { text-align: center; font-size: 11pt; margin-bottom: 4px; }
            .licence-row { text-align: center; font-size: 11pt; margin-bottom: 24px; }
            .to-section { margin-bottom: 24px; font-size: 11pt; line-height: 1.5; }
            .subject { font-weight: bold; text-decoration: underline; margin: 0 0 24px 0; font-size: 12pt; }
            .salutation { margin: 0 0 24px 0; font-size: 11pt; }
            .intro-para { font-size: 11pt; text-align: justify; margin-bottom: 12px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11pt; }
            th, td { border: 1px solid #000; padding: 8px 10px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .flex-spacer { flex: 1; min-height: 20px; }
            .undertaking-title { font-weight: bold; font-size: 12pt; margin: 12px 0 6px 0; text-decoration: underline; }
            .undertaking-text { font-size: 10pt; text-align: justify; line-height: 1.4; margin-bottom: 14px; }
            .undertaking-spacing { height: 42px; }
            .signature-section { margin-top: 20px; font-size: 11pt; }
            .signature-spacing { height: 50px; }
            .signature-line { border-bottom: 1px solid #000; width: 200px; margin: 5px 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="content-wrapper">
            ${printHTML}
          </div>
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
      
      pdf.save(`PO-${poNumber}-Parb-Pharma.pdf`);
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
            <span>Parb Pharma Purchase Order Format</span>
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

        <div ref={printRef} className="p-6 bg-white text-black min-h-[842px] flex flex-col" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt', lineHeight: '1.5' }}>
          {/* Header - Regd. Govt of Punjab (centered) */}
          <p className="text-center text-[12pt] mb-3">Regd. Govt of Punjab</p>

          {/* Hospital Name (centered) */}
          <h1 className="text-[24pt] font-bold text-center mb-3">NAVJEEVAN HOSPITAL</h1>

          {/* Address Row (centered) */}
          <p className="text-center text-[12pt] mb-1">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib,
          </p>

          {/* Mobile (centered) */}
          <p className="text-center text-[12pt] mb-3">
            Mob: 6284942412
          </p>

          {/* Licence Row (centered) - 2 row space after */}
          <p className="text-center text-[11pt] mb-8">
            Licence No.: PSMHC/Pb./2024/863 | Dt. 2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[13pt] mb-5">
            <span>PO No.: {poNumber}</span>
            <span>Date: {formatDate(poDate)}</span>
          </div>

          {/* To Section - 2 row space after */}
          <div className="text-[12pt] mb-8 leading-relaxed">
            <p className="mb-1">To,</p>
            <p className="font-bold">PARB PHARMACEUTICALS PVT. LTD.</p>
            <p>E-9, INDUSTRIAL AREA SIIDCUL, SILAQULI</p>
            <p>DEHRADUN UTTARAKHAND</p>
          </div>

          {/* Subject - 2 row space after */}
          <p className="text-[12pt] mb-8 font-bold">
            <span className="underline">Subject: Purchase Order</span>
          </p>

          {/* Salutation - 2 row space after */}
          <p className="text-[12pt] mb-8">Dear Sir/Madam,</p>

          {/* Intro Paragraph */}
          <p className="text-[11pt] text-justify mb-5 leading-relaxed">
            We hereby placing a purchase order, Terms and Conditions will remain same as Our discussion telephonically. Payment of product shall be done through cheque to your bank account. The name and composition of product give below, please supply as early as possible:
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-5 text-[11pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-2 text-center w-[7%]">Sr.</th>
                <th className="border border-black px-2 py-2 text-center w-[20%]">Product</th>
                <th className="border border-black px-2 py-2 text-center w-[37%]">Compositions</th>
                <th className="border border-black px-2 py-2 text-center w-[12%]">Pack</th>
                <th className="border border-black px-2 py-2 text-center w-[12%]">Strips</th>
                <th className="border border-black px-2 py-2 text-center w-[12%]">Tablets</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = item.packSize || stockItem?.packing || "10×10";
                const qtyInStrips = item.qtyInStrips || item.quantity;
                const qtyInTabs = item.qtyInTabs || (qtyInStrips * 10);
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-black px-2 py-2">{item.stockItemName}</td>
                    <td className="border border-black px-2 py-2">{stockItem?.composition || '-'}</td>
                    <td className="border border-black px-2 py-2 text-center">{packing}</td>
                    <td className="border border-black px-2 py-2 text-center">{qtyInStrips.toLocaleString()}</td>
                    <td className="border border-black px-2 py-2 text-center">{qtyInTabs.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Flex spacer to push undertaking to bottom */}
          <div className="flex-1 min-h-4"></div>

          {/* Undertaking */}
          <div className="mt-auto">
            <p className="font-bold text-[12pt] mb-2">
              <span className="underline">UNDERTAKING:</span>
            </p>
            <p className="text-[10pt] text-justify leading-relaxed">
              We hereby confirm that the products which we intend to buy from PARA PHARMACEUTICALS PVT. LTD. E-9, INDUSTRIAL AREA SIIDCUL, SILAQUI DEHRADUN UTTARAKHAND INDIA Our P.O.NO {poNumber}. .dt- {formatDate(poDate)}. These products purchased by us will be exclusively sold by psychiatric clinic and hospital in addition to the designated de-addiction centers and hospital with de addiction facilities only, on our License no PSMHC/Pb./2024/863. We are full aware these products containing controlled substance as per Narcotic drugs &amp; psychotropic substance Act 1985, and we will keep the relevant records of sale and purchase to us. Also we assure our acknowledgement in form 6(consignment note) for receipt of above purchase item to supplier immediately on receipt of above controlled substances. Further we undertake that we are taking the products for sale of below mentioned formulation &amp; for its sale within india only &amp; not meant for export.
            </p>

            {/* 7 row space after undertaking */}
            <div className="h-16"></div>

            {/* Signature Section */}
            <div className="text-[11pt]">
              <p>For Navjeevan Hospital,</p>
              <p>Opp. New Bus Stand, G.T. Road, Sirhind</p>
              
              {/* Maximum space for sign and stamp */}
              <div className="h-32"></div>
              
              <div className="w-48 border-b border-black"></div>
              <div className="flex gap-10 mt-2">
                <span>{doctorName}</span>
                <span>Date: {formatDate(poDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
