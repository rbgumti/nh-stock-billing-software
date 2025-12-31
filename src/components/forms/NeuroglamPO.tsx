import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrderStore";
import { StockItem } from "@/hooks/useStockStore";
import navjeevanLogo from "@/assets/NH_LOGO.png";
import jsPDF from "jspdf";

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

    if (!logoBase64) {
      setTimeout(handlePrint, 100);
      return;
    }

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
            .undertaking-title { font-weight: bold; font-size: 9px; margin: 10px 0 5px 0; }
            .undertaking-text { font-size: 8px; text-align: justify; line-height: 1.3; margin-bottom: 10px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 15px; font-size: 9px; }
            .sig-left { }
            .sig-center { text-align: center; }
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

  const handleDownloadPDF = () => {
    if (!logoBase64) {
      setTimeout(handleDownloadPDF, 100);
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 10;

    // Header row
    pdf.setFontSize(7);
    pdf.text('Regd. Govt of Punjab', 10, y);
    pdf.text('Mob_ 6284942412', pageWidth - 10, y, { align: 'right' });
    y += 5;

    // Logo and Hospital Name
    const logoSize = 12;
    pdf.addImage(logoBase64, 'PNG', pageWidth / 2 - 35, y, logoSize, logoSize);
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    pdf.text('NAVJEEVAN HOSPITAL', pageWidth / 2, y + 7, { align: 'center' });
    pdf.addImage(logoBase64, 'PNG', pageWidth / 2 + 23, y, logoSize, logoSize);
    y += 15;

    // Address
    pdf.setFontSize(7);
    pdf.setFont('times', 'normal');
    pdf.text('Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib    Dr.Metali Bhatti', pageWidth / 2, y, { align: 'center' });
    y += 4;

    // Licence
    pdf.setFontSize(6);
    pdf.text('Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024', pageWidth / 2, y, { align: 'center' });
    y += 6;

    // PO Number and Date
    pdf.setFontSize(8);
    pdf.setFont('times', 'bold');
    pdf.text(`PO NO _ ${poNumber}`, 10, y);
    pdf.text(`DATE - ${formatDate(poDate)}`, pageWidth - 10, y, { align: 'right' });
    y += 6;

    // To Section
    pdf.setFontSize(7);
    pdf.setFont('times', 'normal');
    pdf.text('To,', 10, y);
    y += 3;
    pdf.setFont('times', 'bold');
    pdf.text('Neuroglam', 10, y);
    y += 3;
    pdf.setFont('times', 'normal');
    pdf.text('Address: Village – Ajnoud, Tehsil – Payal', 10, y);
    y += 3;
    pdf.text('Ludhiana – 141421 (Punjab)', 10, y);
    y += 4;

    pdf.text('Sub : Purchase Order', 10, y);
    y += 5;
    pdf.text("Dear Sir, ma'am", 10, y);
    y += 5;

    // Intro paragraph
    const introText = "We hereby placing a purchase order with Stamp and Sign of our current working doctor's. Terms and Conditions will remain same as our discussion on phonically, payment of product shall be done through cheque to your Bank account, the name and composition of product is given below, please do the supply earlier as possible.";
    const splitIntro = pdf.splitTextToSize(introText, pageWidth - 20);
    pdf.text(splitIntro, 10, y);
    y += splitIntro.length * 3 + 3;

    // Table
    const tableHeaders = ['Sr. No.', 'Product Name', 'Compositions', 'Packing', 'Qty.In Strips', 'Qty.In Tablets'];
    const colWidths = [12, 50, 50, 20, 25, 28];
    let x = 10;

    // Table header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(x, y, pageWidth - 20, 5, 'F');
    pdf.setFontSize(6);
    pdf.setFont('times', 'bold');
    tableHeaders.forEach((header, i) => {
      pdf.text(header, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + colWidths[i] / 2, y + 3.5, { align: 'center' });
    });
    pdf.rect(x, y, pageWidth - 20, 5);
    y += 5;

    // Table rows
    pdf.setFont('times', 'normal');
    items.forEach((item, index) => {
      const stockItem = getStockItemDetails(item.stockItemId);
      const packing = stockItem?.packing || "10*10";
      const packingMatch = packing.match(/(\d+)\*(\d+)/);
      const tabletsPerStrip = packingMatch ? parseInt(packingMatch[1]) * parseInt(packingMatch[2]) : 10;
      const qtyInTablets = item.quantity * tabletsPerStrip;

      const rowData = [
        `${index + 1}.`,
        item.stockItemName,
        stockItem?.composition || '-',
        packing,
        item.quantity.toLocaleString(),
        qtyInTablets.toLocaleString()
      ];

      let cellX = x;
      rowData.forEach((cell, i) => {
        pdf.rect(cellX, y, colWidths[i], 5);
        const align = i === 0 || i === 3 ? 'center' : i >= 4 ? 'right' : 'left';
        const textX = align === 'center' ? cellX + colWidths[i] / 2 : align === 'right' ? cellX + colWidths[i] - 1 : cellX + 1;
        pdf.text(cell, textX, y + 3.5, { align });
        cellX += colWidths[i];
      });
      y += 5;
    });
    y += 3;

    // Undertaking
    pdf.setFont('times', 'bold');
    pdf.setFontSize(7);
    pdf.text('UNDERTAKING:-', 10, y);
    y += 4;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(6);
    const undertaking1 = `We hereby confirm that the product containing psychotropics Substance (Buprenorphine), which we intend to buy from Neuroglam, Village-Ajnoud,Tehsil-Payal,Ludhiana-141421 (Punjab) Our P O. No:${poNumber} ${getMonthYear(poDate)} :date ${formatDate(poDate)}.`;
    const splitUndertaking1 = pdf.splitTextToSize(undertaking1, pageWidth - 20);
    pdf.text(splitUndertaking1, 10, y);
    y += splitUndertaking1.length * 2.5 + 2;

    const undertaking2 = `These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our License No.PSMHC/Punjab/2024/863 we are fully aware These product containing controlled substances as per Narcotic Drugs & Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6(Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation & for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any on-compliance of statutory provisions committed by us intentionally or un-intentionally`;
    const splitUndertaking2 = pdf.splitTextToSize(undertaking2, pageWidth - 20);
    pdf.text(splitUndertaking2, 10, y);
    y += splitUndertaking2.length * 2.5 + 4;

    pdf.setFontSize(7);
    pdf.text('For Navjeevanhospital,opp.New Bus Stand,G.t. Road, Sirhind', 10, y);
    y += 8;

    // Signature section
    pdf.text(`Date: ${formatDate(poDate)}`, 10, y);
    pdf.text('(Navjeevanhospital)', pageWidth / 2, y, { align: 'center' });
    pdf.text('(Dr.Metali Bhatti.)', pageWidth - 10, y, { align: 'right' });

    pdf.save(`PO-${poNumber}-Neuroglam.pdf`);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Neuroglam Purchase Order Format</span>
            <div className="flex gap-2">
              <Button onClick={handleDownloadPDF} size="sm" variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                PDF
              </Button>
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
            Opp. Bus Stand, Vill Bara Sirhind, Distt. Fatehgarh Sahib&nbsp;&nbsp;&nbsp;&nbsp;Dr.Metali Bhatti
          </p>

          {/* Licence Row */}
          <p className="text-center text-[8px] mb-2">
            Licence No. PSMHC/Pb./2024/863 Dt.2-5-2024
          </p>

          {/* PO Number and Date Row */}
          <div className="flex justify-between font-bold text-[10px] mb-3">
            <span>PO NO _ {poNumber}</span>
            <span>DATE - {formatDate(poDate)}</span>
          </div>

          {/* To Section */}
          <div className="text-[9px] mb-2 leading-snug">
            <p className="mb-1">To,</p>
            <p className="font-bold">Neuroglam</p>
            <p>Address: Village – Ajnoud, Tehsil – Payal</p>
            <p>Ludhiana – 141421 (Punjab)</p>
          </div>

          {/* Subject */}
          <p className="text-[9px] mb-1">Sub : Purchase Order</p>

          {/* Salutation */}
          <p className="text-[9px] my-2">Dear Sir, ma&apos;am</p>

          {/* Intro Paragraph */}
          <p className="text-[9px] text-justify mb-2 leading-snug">
            We hereby placing a purchase order with Stamp and Sign of our current working doctor&apos;s. Terms and Conditions will remain same asour discussion on phonically, payment of product shall be done through cheque to yourBank account, the name and composition of product is given below, please do the supply earlier as possible.
          </p>

          {/* Items Table */}
          <table className="w-full border-collapse mb-2 text-[9px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-1 py-0.5 text-center">Sr. No.</th>
                <th className="border border-black px-1 py-0.5 text-center">Product Name</th>
                <th className="border border-black px-1 py-0.5 text-center">Compositions</th>
                <th className="border border-black px-1 py-0.5 text-center">Packing</th>
                <th className="border border-black px-1 py-0.5 text-center">Qty.In Strips</th>
                <th className="border border-black px-1 py-0.5 text-center">Qty.In Tablets</th>
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
                    <td className="border border-black px-1 py-0.5 text-center">{index + 1}.</td>
                    <td className="border border-black px-1 py-0.5">{item.stockItemName}</td>
                    <td className="border border-black px-1 py-0.5">{stockItem?.composition || '-'}</td>
                    <td className="border border-black px-1 py-0.5 text-center">{packing}</td>
                    <td className="border border-black px-1 py-0.5 text-right">{item.quantity.toLocaleString()}</td>
                    <td className="border border-black px-1 py-0.5 text-right">{qtyInTablets.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Undertaking */}
          <p className="font-bold text-[9px] mb-1">UNDERTAKING:-</p>
          <p className="text-[8px] text-justify leading-snug mb-1">
            We hereby confirm that the productcontaining psychotropics Substance (Buprenorphine), which we intend to buy from Neuroglam, Village-Ajnoud,Tehsil-Payal,Ludhiana-141421 (Punjab) Our P O. No:{poNumber} {getMonthYear(poDate)} :date {formatDate(poDate)}.
          </p>
          <p className="text-[8px] text-justify leading-snug mb-3">
            These products purchased by us will be exclusively sold by De Addiction centre and qualified Doctors only, on our License No.PSMHC/Punjab/2024/863 we are fully aware These product containing controlled substances as per Narcotic Drugs &amp; Psychotropic Substances Act 1985. And we will keep the relevant records of sale and purchase to us. Also we assure our Acknowledgement in form-6(Consignment Note) for the receipt of above purchase item to supplier Immediately on receipt of above controlled substance, Further we undertake that we are taking The products for sale below mentioned formulation &amp; for its sale within India only and not meant for any retailer counter or Export purposes. Rusan Pharma Ltd shall not be liable for any on-compliance of statutory provisions committed by us intentionally or un-intentionally
          </p>

          <p className="text-[9px] mb-3">
            For Navjeevanhospital,opp.New Bus Stand,G.t. Road, Sirhind
          </p>

          {/* Signature Section */}
          <div className="flex justify-between items-end mt-4 text-[9px]">
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
