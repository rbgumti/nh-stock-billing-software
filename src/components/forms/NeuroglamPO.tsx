import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import navjeevanLogo from "@/assets/NH_LOGO.png";

interface NeuroglamPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function NeuroglamPO({ poNumber, poDate, items, stockItems, onClose }: NeuroglamPOProps) {
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
            .po-date-row { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; font-weight: bold; }
            .to-section { margin-bottom: 15px; font-size: 11px; line-height: 1.6; }
            .to-section .company { font-weight: bold; margin-top: 5px; }
            .subject-line { margin-top: 10px; }
            .salutation { margin: 15px 0 10px 0; font-size: 11px; }
            .intro-para { font-size: 11px; text-align: justify; margin-bottom: 15px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
            th, td { border: 1px solid #000; padding: 6px 8px; }
            th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
            td { text-align: left; }
            td.center { text-align: center; }
            td.right { text-align: right; }
            .undertaking-title { font-weight: bold; font-size: 11px; margin: 20px 0 10px 0; }
            .undertaking-text { font-size: 10px; text-align: justify; line-height: 1.6; margin-bottom: 20px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px; }
            .sig-left { }
            .sig-center { text-align: center; }
            .sig-right { text-align: right; }
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
            <span>Neuroglam Purchase Order Format</span>
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
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Dr.Metali Bhatti
          </p>

          {/* Licence Row */}
          <p className="text-center text-[10px] mb-4">
            Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[12px] mb-5">
            <span>PO NO _ {poNumber}</span>
            <span>DATE - {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[11px] mb-4 leading-relaxed">
            <p className="mb-2">To,</p>
            <p className="font-bold">Neuroglam</p>
            <p>Address: Village – Ajnoud, Tehsil – Payal</p>
            <p>Ludhiana – 141421 (Punjab)</p>
          </div>

          {/* Subject */}
          <p className="text-[11px] mb-3">Sub : Purchase Order</p>

          {/* Salutation */}
          <p className="text-[11px] my-4">Dear Sir, ma&apos;am</p>

          {/* Intro Paragraph */}
          <p className="text-[11px] text-justify mb-4 leading-relaxed">
            We hereby placing a purchase order with Stamp and Sign of our current working doctor&apos;s. Terms and Conditions will remain same asour discussion on phonically, payment of product shall be done through cheque to yourBank account, the name and composition of product is given below, please do the supply earlier as possible.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-5 text-[11px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center">Sr. No.</th>
                <th className="border border-black p-2 text-center">Product Name</th>
                <th className="border border-black p-2 text-center">Compositions</th>
                <th className="border border-black p-2 text-center">Packing</th>
                <th className="border border-black p-2 text-center">Qty.In Strips</th>
                <th className="border border-black p-2 text-center">Qty.In Tablets</th>
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
                    <td className="border border-black p-2 text-center">{packing}</td>
                    <td className="border border-black p-2 text-right">{item.quantity.toLocaleString()}</td>
                    <td className="border border-black p-2 text-right">{qtyInTablets.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Undertaking */}
          <p className="font-bold text-[11px] mb-2">UNDERTAKING:-</p>
          <p className="text-[10px] text-justify leading-relaxed mb-2">
            We hereby confirm that the productcontaining psychotropics Substance (Buprenorphine), which we intend to buy from Neuroglam, Village-Ajnoud,Tehsil-Payal,Ludhiana-141421 (Punjab) Our P O. No:{poNumber} {getMonthYear(poDate)} :date {formatDate(poDate)}.
          </p>
          <p className="text-[10px] text-justify leading-relaxed mb-6">
            These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our License No.PSMHC/Punjab/2024/863 we are fully aware These product containing controlled substances as per Narcotic Drugs &amp; Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6(Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation &amp; for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any on-compliance of statutory provisions committed by us intentionally or un-intentionally
          </p>

          <p className="text-[11px] mb-6">
            For Navjeevanhospital,opp.New Bus Stand,G.t. Road, Sirhind
          </p>

          {/* Signature Section */}
          <div className="flex justify-between items-end mt-8 text-[11px]">
            <div>
              <p>Date: {formatDate(poDate)}</p>
            </div>
            <div className="text-center">
              <p>(Navjeevanhospital)</p>
            </div>
            <div className="text-right">
              <p>(Dr.Metali Bhatti.)</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
