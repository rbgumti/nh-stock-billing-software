import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import navjeevanLogo from "@/assets/NH_LOGO.png";

interface VyadoHealthcarePOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function VyadoHealthcarePO({ poNumber, poDate, items, stockItems, onClose }: VyadoHealthcarePOProps) {
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
            .ref-po-section { text-align: center; font-size: 10px; margin-bottom: 10px; }
            .to-section { margin-bottom: 8px; font-size: 9px; line-height: 1.4; margin-left: 60px; }
            .subject-section { margin-left: 60px; font-size: 9px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9px; }
            th, td { border: 1px solid #000; padding: 3px 5px; }
            th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            .footer-section { font-size: 9px; margin-top: 15px; margin-left: 60px; line-height: 1.5; }
            .signature-section { font-size: 9px; margin-top: 15px; margin-left: 60px; line-height: 1.4; }
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
            <span>VYADO Healthcare Purchase Order Format</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-4 bg-white text-black" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '10px', lineHeight: '1.3' }}>
          {/* Header Row */}
          <div className="flex justify-between text-[9px] mb-1">
            <span>Regd. Govt of Punjab</span>
            <span>Mob_ 6284942412</span>
          </div>

          {/* Hospital Header with Logo */}
          <div className="flex items-center justify-center gap-2 my-2">
            <img src={navjeevanLogo} alt="Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-lg font-bold">NAVJEEVAN HOSPITAL</h1>
            <img src={navjeevanLogo} alt="Logo" className="w-10 h-10 object-contain" />
          </div>

          {/* Address Row */}
          <p className="text-center text-[9px] mb-0.5">
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;Dr. Metali Bhatti
          </p>

          {/* Licence Row */}
          <p className="text-center text-[8px] mb-2">
            Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024
          </p>

          {/* REF NO and PO NO */}
          <div className="text-center text-[10px] mb-1">
            <p>REF NO – {poNumber}</p>
          </div>
          <div className="flex justify-between text-[10px] mb-3 px-10">
            <span>PO NO {poNumber}</span>
            <span>Date- {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[9px] mb-2 leading-snug ml-16">
            <p className="mb-0.5">To</p>
            <p className="font-bold">VYADO HEALTHCARE PVT LTD</p>
            <p>Gali no.4,VinodNagar,Hisar</p>
            <p>125001</p>
          </div>

          {/* Subject Section */}
          <div className="text-[9px] mb-2 ml-16">
            <p>Subject: Medicine order</p>
            <p className="mt-1">Respected Sir/Ma&apos;am</p>
            <p className="mt-1">Kindly provide us :-</p>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-2 text-[9px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-1 py-0.5 text-center">SR.NO.</th>
                <th className="border border-black px-1 py-0.5 text-center">PRODUCT NAME</th>
                <th className="border border-black px-1 py-0.5 text-center">packing</th>
                <th className="border border-black px-1 py-0.5 text-center">QTY.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const stockItem = getStockItemDetails(item.stockItemId);
                const packing = stockItem?.packing || "10*10";
                
                return (
                  <tr key={index}>
                    <td className="border border-black px-1 py-0.5 text-center">{index + 1}</td>
                    <td className="border border-black px-1 py-0.5">{item.stockItemName}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{packing}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{item.quantity}TAB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Section */}
          <div className="text-[9px] mt-3 ml-16 leading-snug">
            <p>For our centre Navjeevan hospital at below written address at the earliest.</p>
            <p className="mt-1">Address: Navjeevan hospital Opp.Busstand,Vill.Bara,Sirhind,distt. Fatehgarh sahib.</p>
          </div>

          {/* Signature Section */}
          <div className="text-[9px] mt-4 ml-16 leading-snug">
            <p>Thanking you</p>
            <p>Yours Sincerely,</p>
            <p className="mt-1">Navjeevan Hospital,</p>
            <p>OPP.NEW BUS STAND,</p>
            <p>G.T.ROAD, BARA,SIRHIND,</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
