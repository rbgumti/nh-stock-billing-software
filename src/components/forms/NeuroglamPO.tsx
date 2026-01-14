import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAppSettings } from "@/hooks/usePerformanceMode";

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
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' }).replace(/\//g, '-');
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
            .header-regd { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 4px; }
            .hospital-name { font-size: 22pt; font-weight: bold; text-align: center; margin: 6px 0; }
            .address-row { text-align: center; font-size: 10pt; margin-bottom: 3px; }
            .doctor-name { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 3px; }
            .licence-row { text-align: center; font-size: 10pt; margin-bottom: 12px; }
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12pt; font-weight: bold; }
            .to-section { margin-bottom: 10px; font-size: 11pt; line-height: 1.5; }
            .subject-row { font-size: 12pt; font-weight: bold; text-align: center; margin: 10px 0; }
            .salutation { margin: 8px 0; font-size: 11pt; }
            .intro-para { font-size: 10pt; text-align: justify; margin-bottom: 10px; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
            th, td { border: 1px solid #000; padding: 6px 8px; }
            th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .flex-spacer { flex: 1; min-height: 20px; }
            .undertaking-section { margin-top: auto; }
            .undertaking-title { font-weight: bold; font-size: 11pt; margin: 10px 0 6px 0; }
            .undertaking-text { font-size: 9pt; text-align: justify; line-height: 1.35; margin-bottom: 6px; }
            .liability-title { font-weight: bold; font-size: 11pt; margin: 10px 0 6px 0; }
            .liability-text { font-size: 9pt; text-align: justify; line-height: 1.35; margin-bottom: 10px; }
            .for-section { font-size: 10pt; margin-top: 12px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 25px; font-size: 11pt; }
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
      
      pdf.save(`PO-${poNumber}-Neuroglam.pdf`);
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
            <p className="font-bold">NEUROGLAM</p>
            <p>Village – Ajnoud, Tehsil – Payal</p>
            <p>Ludhiana – 141421 (Punjab)</p>
          </div>

          {/* Subject - 2 row space after */}
          <p className="text-[12pt] mb-8 font-bold">
            <span className="underline">Subject: Purchase Order</span>
          </p>

          {/* Salutation - 2 row space after */}
          <p className="text-[12pt] mb-8">Dear Sir/Madam,</p>

          {/* Intro Paragraph */}
          <p className="text-[11pt] text-justify mb-5 leading-relaxed">
            We hereby placing a purchase order with Stamp and Sign of our current working doctor's. Terms and Conditions will remain same as our discussion telephonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.
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
                const qtyInTabs = item.qtyInTabs || qtyInStrips * 10;
                
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
            <p className="text-[10pt] text-justify leading-relaxed mb-2">
              We hereby confirm that the product containing the psychotropic substance Buprenorphine, which we intend to procure from Neuroglam, Village Ajnoud, Tehsil Payal, Ludhiana – 141421 (Punjab), is covered under our Purchase Order No. {poNumber.replace('NH/PO-', '')} dated {formatDate(poDate)} ({getMonthYear(poDate)}).
            </p>
            <p className="text-[10pt] text-justify leading-relaxed mb-2">
              The products purchased by us will be exclusively supplied to De-Addiction Centres and qualified Doctors under our valid License No. PSMHC/Punjab/2024/863. We are fully aware that this product contains controlled substances regulated under the Narcotic Drugs and Psychotropic Substances Act, 1985, and we shall maintain all statutory records pertaining to its sale and purchase.
            </p>
            <p className="text-[10pt] text-justify leading-relaxed mb-2">
              We further assure that an Acknowledgement (Form-6 Consignment Note) for the receipt of the above substance will be issued to the supplier immediately upon delivery.
            </p>
            <p className="text-[10pt] text-justify leading-relaxed">
              Additionally, we undertake that the procured product will be used only for the formulations and sales mentioned below and will be marketed within India only. These products are not intended for retail counter sale or export.
            </p>

            {/* Neuroglam Liability Acknowledgment */}
            <p className="font-bold text-[11pt] mt-3 mb-1">
              <span className="underline">Neuroglam Liability Acknowledgment:</span>
            </p>
            <p className="text-[10pt] text-justify leading-relaxed">
              We acknowledge that Neuroglam shall not be held liable for any non-compliance with statutory provisions committed by us, whether intentionally or unintentionally.
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
