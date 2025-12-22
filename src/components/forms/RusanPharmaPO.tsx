import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";

interface RusanPharmaPOProps {
  poNumber: string;
  poDate: string;
  items: PurchaseOrderItem[];
  stockItems: StockItem[];
  onClose: () => void;
}

export function RusanPharmaPO({ poNumber, poDate, items, stockItems, onClose }: RusanPharmaPOProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  const getStockItemDetails = (stockItemId: number) => {
    return stockItems.find(item => item.id === stockItemId);
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
          <title>Purchase Order - ${poNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Times New Roman', Times, serif; padding: 20px; font-size: 12px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 10px; }
            .header-top { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 5px; }
            .hospital-name { font-size: 22px; font-weight: bold; margin: 5px 0; }
            .hospital-address { font-size: 11px; margin-bottom: 5px; }
            .licence { font-size: 10px; margin-bottom: 10px; }
            .po-info { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; }
            .recipient { margin-bottom: 15px; font-size: 11px; }
            .recipient p { margin: 2px 0; }
            .salutation { margin: 15px 0; font-size: 11px; }
            .intro-text { margin-bottom: 15px; font-size: 11px; text-align: justify; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10px; }
            th, td { border: 1px solid #000; padding: 5px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .undertaking { margin: 15px 0; font-size: 10px; text-align: justify; font-weight: bold; }
            .undertaking-text { margin: 10px 0; font-size: 10px; text-align: justify; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; }
            .signature-left, .signature-right { text-align: center; }
            .footer-stamp { margin-top: 30px; font-size: 10px; }
            .stamp-box { border: 1px solid #000; padding: 10px; display: inline-block; margin-top: 10px; }
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
            <span>Rusan Pharma Purchase Order Format</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="p-4 bg-white text-black" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
          {/* Header */}
          <div className="text-center mb-4">
            <div className="flex justify-between text-xs mb-2">
              <span>Regd. Govt of Punjab</span>
              <span>Mob_ 6284942412</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">NAVJEEVAN HOSPITAL</h1>
            <p className="text-sm mb-1">Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;Dr.metali Bhatti</p>
            <p className="text-xs">Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024</p>
          </div>

          {/* PO Info */}
          <div className="flex justify-between mb-4 text-sm">
            <span>PO NO- {poNumber}</span>
            <span>DATE -{formatDate(poDate)}</span>
          </div>

          {/* Recipient */}
          <div className="mb-4 text-sm">
            <p>To,</p>
            <p className="font-semibold mt-2">Rusan Pharma Ltd.</p>
            <p>Khasra No. 122MI, Central Hope Town,</p>
            <p>Selaqui, Dehradun, Uttarakhand-248197</p>
            <p>Sub: Pu/rchase Order</p>
          </div>

          {/* Salutation */}
          <p className="mb-3 text-sm">Dear Sir, ma'am</p>

          {/* Intro Text */}
          <p className="mb-4 text-sm text-justify">
            We hereby place a purchase order with Stamp and Sign of our current working doctor's. 
            Terms and Conditions will remain same asour discussion on phonically, payment of product 
            shall be done through cheque to your Bank account, the name and composition of product 
            is given below, please do the supply earlier as possible.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4 text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left">Sr. No.</th>
                <th className="border border-black p-2 text-left">Product Name</th>
                <th className="border border-black p-2 text-left">Compositions</th>
                <th className="border border-black p-2 text-left">Packing</th>
                <th className="border border-black p-2 text-right">Qty.In Strips</th>
                <th className="border border-black p-2 text-right">Qty.In Tablets</th>
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
                    <td className="border border-black p-2">{index + 1}.</td>
                    <td className="border border-black p-2">{item.stockItemName}</td>
                    <td className="border border-black p-2">{stockItem?.composition || '-'}</td>
                    <td className="border border-black p-2">{packing}</td>
                    <td className="border border-black p-2 text-right">{item.quantity}</td>
                    <td className="border border-black p-2 text-right">{qtyInTablets.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Undertaking */}
          <p className="font-bold text-xs mb-2">UNDERTAKING:-</p>
          <p className="text-xs text-justify mb-4">
            We hereby confirm that the product which we intend to buy from RUSAN PHARMA 
            LTD. KHASRA NO. 122MI, CENTRAL HOPE TOWN,SELAQUI, DEHRADUN, 
            UTTARAKHAND.248197 Our P.O. No:{poNumber} (December 2025) :date {formatDate(poDate)}. These 
            products purchased by us will be exclusively sold by De Addiction centre and qualified 
            Doctors only, on our <u>License No.PSMHC/Punjab/2024/863</u> we are fully aware These 
            product containing controlled substances as per Narcotic Drugs & Psychotropic 
            Substances Act 1985. And we will keep the relevant records of sale and purchase to us. 
            Also we assure our Acknowledgement in form-6(Consignment Note) for the receipt of 
            above purchase item to supplier Immediately on receipt of above controlled 
            substance. Further we undertake that we are taking The products for sale below 
            mentioned formulation & for its sale within India only and not meant for any retailer 
            counter or Export purposes. Rusan Pharma Ltd shall not be liable for any on 
            compliance of statutory provisions committed by us intentionally or un-intentionally 
            For <strong>Navjeevanhospital,opp.New Bus Stand,G.t. Road, Sirhind</strong>
          </p>

          {/* Signature Section */}
          <div className="flex justify-between mt-10 text-sm">
            <div className="text-center">
              <p>Date: {formatDate(poDate)}</p>
              <p className="mt-4">(Navjeevanhospital)</p>
              <div className="mt-6 border border-black p-2 inline-block text-xs">
                <p className="font-bold">NAVJEEEVAN HOSPITAL</p>
                <p>Opp. Bus Stand, Bara Sirhind</p>
                <p>Distt. Fatehgarh Sahib (Pb.)</p>
              </div>
            </div>
            <div className="text-center">
              <p>(Dr.metali Bhatti)</p>
              <div className="mt-10 text-xs">
                <p className="font-bold">DR. METALI BHATTI</p>
                <p>M.B.B.S, MD - PSYHIATRY</p>
                <p>PMC - 57865</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
