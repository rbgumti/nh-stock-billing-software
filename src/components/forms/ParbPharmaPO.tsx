import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import navjeevanLogo from "@/assets/NH_LOGO.png";

interface ParbPharmaPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function ParbPharmaPO({ poNumber, poDate, items, stockItems, onClose }: ParbPharmaPOProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [logoBase64, setLogoBase64] = useState<string>("");

  // Convert logo to base64 for print window
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setLogoBase64(canvas.toDataURL("image/png"));
      }
    };
    img.src = navjeevanLogo;
  }, []);

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

    // Wait for logo to be ready
    if (!logoBase64) {
      setTimeout(handlePrint, 100);
      return;
    }

    // Replace logo src with base64 for print
    const printHTML = printContent.innerHTML.replace(
      /src="[^"]*NH_LOGO[^"]*"/g,
      `src="${logoBase64}"`
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${poNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Times New Roman', Times, serif; padding: 8px 15px; font-size: 10px; line-height: 1.3; }
            .header-section { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 5px; }
            .logo { width: 45px; height: 45px; object-fit: contain; }
            .header-row { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 4px; }
            .hospital-name { font-size: 18px; font-weight: bold; text-align: center; margin: 3px 0; }
            .address-row { text-align: center; font-size: 9px; margin-bottom: 3px; }
            .licence-row { text-align: center; font-size: 8px; margin-bottom: 8px; }
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 10px; font-weight: bold; }
            .to-section { margin-bottom: 8px; font-size: 9px; line-height: 1.4; }
            .to-section .company { font-weight: bold; margin-top: 3px; }
            .subject-line { margin-top: 5px; }
            .salutation { margin: 8px 0 5px 0; font-size: 9px; }
            .intro-para { font-size: 9px; text-align: justify; margin-bottom: 8px; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9px; }
            th, td { border: 1px solid #000; padding: 3px 5px; }
            th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .undertaking-title { font-weight: bold; font-size: 9px; margin: 10px 0 5px 0; text-align: right; }
            .undertaking-text { font-size: 8px; text-align: justify; line-height: 1.3; margin-bottom: 10px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 15px; font-size: 9px; }
            .sig-left { }
            .sig-right { text-align: right; }
            @media print {
              body { padding: 5mm 10mm; }
              @page { margin: 5mm; size: A4; }
            }
          </style>
        </head>
        <body>
          ${printHTML}
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
            <span>Parb Pharma Purchase Order Format</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-6 bg-white text-black" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
          {/* Header Row */}
          <div className="flex justify-between text-[11px] mb-2">
            <span>Regd. Govt of Punjab</span>
            <span>Mob_ 6284942412</span>
          </div>

          {/* Hospital Header with Logo */}
          <div className="flex items-center justify-center gap-4 my-3">
            <img src={navjeevanLogo} alt="Logo" className="w-14 h-14 object-contain" />
            <h1 className="text-2xl font-bold">NAVJEEVAN HOSPITAL</h1>
            <img src={navjeevanLogo} alt="Logo" className="w-14 h-14 object-contain" />
          </div>

          {/* Address Row */}
          <p className="text-center text-[11px] mb-1">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Dr. Metalli Bhatti
          </p>

          {/* Licence Row */}
          <p className="text-center text-[10px] mb-4">
            Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[12px] mb-5">
            <span>P.O  NO_ {poNumber}</span>
            <span>DATE - {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[11px] mb-4 leading-relaxed">
            <p className="mb-1">To,</p>
            <p className="font-bold">PARB PHARMACEUTICALS PVT. LTD.</p>
            <p>E-9,INDUSTRIAL AREA SIIDCUL,SILAQULI</p>
            <p>DEHRADUN UTTARAKHAND</p>
          </div>

          {/* Subject */}
          <p className="text-[11px] mb-3">Subject: purchase order.</p>

          {/* Salutation */}
          <p className="text-[11px] mb-3">Dear sir,ma&apos;am</p>

          {/* Intro Paragraph */}
          <p className="text-[11px] text-justify mb-4 leading-relaxed">
            We hereby placing a purchase order , Terms and Conditions will remain same as Our discussion on phonically. payment of product shall be done through cheque to your bank account. The name and composition of product give below, please do the supply earlier as possible.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-5 text-[11px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center">S. No.</th>
                <th className="border border-black p-2 text-center">Product Name</th>
                <th className="border border-black p-2 text-center">composition</th>
                <th className="border border-black p-2 text-center">QTY IN TABLETS</th>
                <th className="border border-black p-2 text-center">PACKING</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10*10";
                const packingMatch = packing.match(/(\d+)\*(\d+)/);
                const tabletsPerStrip = packingMatch ? parseInt(packingMatch[1]) * parseInt(packingMatch[2]) : 10;
                const qtyInTablets = item.quantity * tabletsPerStrip;
                
                return (
                  <tr key={index}>
                    <td className="border border-black p-2 text-center">{index + 1}.</td>
                    <td className="border border-black p-2">{item.stockItemName}</td>
                    <td className="border border-black p-2">{stockItem?.composition || '-'}</td>
                    <td className="border border-black p-2 text-right">{qtyInTablets.toLocaleString()}</td>
                    <td className="border border-black p-2 text-center">{packing}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Undertaking */}
          <p className="font-bold text-[11px] mb-2 text-right">UNDERTAKING</p>
          <p className="text-[10px] text-justify leading-relaxed mb-6">
            We hereby confirm that the products which we intend to buy from PARA PHARMACEUTICALS PVT. LTD. E-9,INDUSTRIAL AREA SIIDCUL,SILAQUI DEHRADUN UTTARAKHAND INDIA Our P.O.NO {poNumber} .dt- {formatDate(poDate)}.These products purchased by us will be exclusively sold by psychiatric clinic and hospital in addition to the designated de-addiction centers and hospital with de addiction facilities only ,on our License no PSMHC/Pb./2024/863.We are full aware these products containing controlled substance as per Narcotic drugs &amp; psychotropic substance Act 1985,and we will keep the relevant records of sale and purchase to us. Also we assure our acknowledgement in form 6(consignment note) for receipt of above purchase item to supplier immediately on receipt of above controlled substances. Further we undertake that we are taking the products for sale of below mentioned formulation &amp;for its sale within india only &amp; not meant for export.
          </p>

          {/* Date and Signature Section */}
          <div className="text-[11px] mb-8">
            <p>Date. {formatDate(poDate)}</p>
          </div>

          <p className="text-[11px] mb-2">.</p>

          {/* Signature Section */}
          <div className="flex justify-between items-end mt-8 text-[11px]">
            <div></div>
            <div className="text-center">
              <p>for Navjeevan hospital, sirhind</p>
            </div>
            <div className="text-right">
              <p>Dr.Metalli Bhatti</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
