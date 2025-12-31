import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import navjeevanLogo from "@/assets/NH_LOGO.png";

interface VeeEssPharmaPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function VeeEssPharmaPO({ poNumber, poDate, items, stockItems, onClose }: VeeEssPharmaPOProps) {
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

  const formatDateSlash = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' });
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
            body { font-family: 'Times New Roman', Times, serif; padding: 15px 25px; font-size: 12px; line-height: 1.5; }
            .header-section { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px; }
            .logo { width: 60px; height: 60px; object-fit: contain; }
            .header-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; }
            .hospital-name { font-size: 24px; font-weight: bold; text-align: center; margin: 5px 0; }
            .address-row { text-align: center; font-size: 11px; margin-bottom: 5px; }
            .licence-row { text-align: center; font-size: 10px; margin-bottom: 15px; }
            .ref-po-section { text-align: center; font-size: 12px; margin-bottom: 10px; }
            .to-section { margin-bottom: 15px; font-size: 11px; line-height: 1.6; margin-left: 120px; }
            .subject-section { margin-left: 120px; font-size: 11px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
            th, td { border: 1px solid #000; padding: 6px 8px; }
            th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            .footer-section { font-size: 11px; margin-top: 25px; margin-left: 120px; line-height: 1.8; }
            .signature-section { font-size: 11px; margin-top: 20px; margin-left: 120px; line-height: 1.6; }
            @media print {
              body { padding: 10mm 15mm; }
              @page { margin: 10mm; }
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
            <span>VEE ESS Pharmaceuticals Purchase Order Format</span>
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

          {/* REF NO */}
          <div className="text-center text-[12px] mb-2">
            <p>REF NO – {poNumber}</p>
          </div>

          {/* PO NO and Date */}
          <div className="flex justify-between text-[12px] mb-5 px-16">
            <span>PO NO - {poNumber}</span>
            <span>DATE – {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[11px] mb-4 leading-relaxed ml-28">
            <p className="mb-1">To</p>
            <p className="font-bold">VEE ESS PHARMACEUTICALS</p>
            <p>PATRAN ROAD DRB,SANGRUR</p>
            <p>PUNJAB-148035</p>
            <p className="mt-2">Subject:Medicine order</p>
            <p className="mt-2">Dear Sir,Ma&apos;am</p>
            <p className="mt-2">Kindly provide us :-</p>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-5 text-[11px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center">Sr. No.</th>
                <th className="border border-black p-2 text-center">Product name</th>
                <th className="border border-black p-2 text-center">Pack</th>
                <th className="border border-black p-2 text-center">Qty.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10*10";
                
                return (
                  <tr key={index}>
                    <td className="border border-black p-2 text-center">{index + 1}.</td>
                    <td className="border border-black p-2">{item.stockItemName}</td>
                    <td className="border border-black p-2 text-center">{packing}</td>
                    <td className="border border-black p-2 text-center">{item.quantity}TAB</td>
                  </tr>
                );
              })}
              {/* Empty rows for consistency */}
              {items.length < 4 && Array.from({ length: 4 - items.length }).map((_, idx) => (
                <tr key={`empty-${idx}`}>
                  <td className="border border-black p-2 text-center">&nbsp;</td>
                  <td className="border border-black p-2">&nbsp;</td>
                  <td className="border border-black p-2 text-center">&nbsp;</td>
                  <td className="border border-black p-2 text-center">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Section */}
          <div className="text-[11px] mt-6 ml-28 leading-relaxed">
            <p>For our centre Navjeevan hospital at below written address at the earliest.</p>
            <p className="mt-2">Address: Navjeevan hospital Opp.Busstand,Vill.Bara,Sirhind,distt. Fatehgarh sahib.</p>
            <p className="mt-3">Thanking you</p>
            <p>Yours Sincerely,</p>
            <p className="mt-2">Navjeevanhospital,Sirhind</p>
            <p>Date: {formatDateSlash(poDate)}</p>
            <p className="mt-2">OPP.NEW BUS STAND,</p>
            <p>G.T.ROAD, BARA ,SIRHIND</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
